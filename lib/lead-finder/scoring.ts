import OpenAI from "openai";
import { isOpenAiConfigured } from "@/lib/env/server";
import type { ProviderCandidate, ScoredCandidate } from "@/lib/lead-finder/types";

type ScoreInput = ProviderCandidate & {
  enrichment_summary: string | null;
  keywords: string[];
};

export type LeadFinderScoreFields = Pick<
  ScoredCandidate,
  | "asset_likelihood_score"
  | "likely_asset_types"
  | "outreach_angle"
  | "reason_selected"
  | "score"
  | "score_source"
  | "score_explanation"
>;

const ASSET_TAGS = [
  "Scrap metal",
  "Electrical surplus / switchgear",
  "Circuit breakers & panels",
  "Transformers",
  "Industrial machinery",
  "Heavy equipment",
  "Pipe & valves",
  "Fleet / service vehicles",
  "Warehouse / plant surplus",
] as const;

const EQUIPMENT_TYPE_HINTS: Record<string, string[]> = {
  Forklifts: ["Heavy equipment", "Warehouse / plant surplus"],
  "Electrical equipment": ["Electrical surplus / switchgear", "Industrial machinery"],
  "Circuit breakers": ["Circuit breakers & panels", "Electrical surplus / switchgear"],
  Valves: ["Pipe & valves", "Industrial machinery"],
  Machinery: ["Industrial machinery", "Warehouse / plant surplus"],
  "Scrap metal": ["Scrap metal", "Warehouse / plant surplus"],
  "Warehouse inventory": ["Warehouse / plant surplus"],
  "Plant closure assets": ["Warehouse / plant surplus", "Industrial machinery"],
  "Liquidation inventory": ["Warehouse / plant surplus"],
  "Mixed / other": [],
};

/** Default asset mix implied by preset category (potential sellers — not resale businesses). */
function assetsForPreset(targetIndustry: string): string[] {
  const t = targetIndustry.trim().toLowerCase();
  if (t.includes("electrical")) return ["Electrical surplus / switchgear", "Circuit breakers & panels", "Transformers"];
  if (t.includes("energy services")) return ["Electrical surplus / switchgear", "Industrial machinery"];
  if (t.includes("construction")) return ["Heavy equipment", "Pipe & valves", "Scrap metal"];
  if (t.includes("well drilling")) return ["Industrial machinery", "Heavy equipment", "Pipe & valves"];
  if (t.includes("solar")) return ["Electrical surplus / switchgear", "Industrial machinery"];
  if (t === "power plants" || t.includes("power plant")) return ["Transformers", "Electrical surplus / switchgear", "Industrial machinery"];
  if (t.includes("power companies")) return ["Electrical surplus / switchgear", "Transformers"];
  if (t.includes("electronic manufacturing")) return ["Electrical surplus / switchgear", "Industrial machinery", "Warehouse / plant surplus"];
  if (t.includes("crane")) return ["Heavy equipment", "Scrap metal", "Industrial machinery"];
  if (t.includes("oilfield")) return ["Pipe & valves", "Heavy equipment", "Industrial machinery"];
  if (t.includes("machine") && t.includes("tool")) return ["Industrial machinery", "Warehouse / plant surplus"];
  if (t.includes("demolition")) return ["Scrap metal", "Heavy equipment", "Warehouse / plant surplus"];
  if (t.includes("large manufacturing")) return ["Industrial machinery", "Warehouse / plant surplus", "Heavy equipment"];
  if (t.includes("chemical")) return ["Industrial machinery", "Pipe & valves", "Warehouse / plant surplus"];
  if (t.includes("automotive manufacturing")) return ["Industrial machinery", "Heavy equipment"];
  if (t.includes("natural gas")) return ["Pipe & valves", "Industrial machinery", "Electrical surplus / switchgear"];
  if (t.includes("plumbing")) return ["Pipe & valves", "Warehouse / plant surplus"];
  if (t.includes("mechanical")) return ["Industrial machinery", "Pipe & valves", "Heavy equipment"];
  return [...ASSET_TAGS.slice(0, 4)];
}

function uniqPick(list: readonly string[], max: number): string[] {
  const out: string[] = [];
  for (const item of list) {
    const s = item.trim();
    if (!s || out.some((x) => x.toLowerCase() === s.toLowerCase())) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function textBlob(c: ScoreInput): string {
  return [
    c.company_name,
    c.industry,
    c.formatted_address,
    c.enrichment_summary ?? "",
    c.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function baselinePreset(targetIndustry: string): number {
  const t = targetIndustry.trim().toLowerCase();
  const plant =
    /chemical|natural gas|power plant|automotive manufacturing|large manufacturing/i.test(targetIndustry);
  const utilityHeavy = /^power companies$/i.test(targetIndustry.trim()) || t.includes("energy services");
  if (plant || utilityHeavy) return 72;
  if (
    /demolition|crane|oilfield|electrical|mechanical|construction|well drilling/i.test(
      targetIndustry
    )
  ) {
    return 64;
  }
  return 58;
}

function operationalBoosts(low: string): { add: number; hits: string[] } {
  const strong = [
    "maintenance",
    "installation",
    "removal",
    "teardown",
    "retrofit",
    "shutdown",
    "upgrade",
    "equipment replacement",
    "industrial service",
    "fabrication",
    "machining",
    "oilfield",
    "drilling rig",
    "switchgear",
    "transformer",
    "fleet",
    "plant",
    "factory",
    "warehouse",
    "utility",
    "substation",
  ];
  const hits = strong.filter((w) => low.includes(w));
  return { add: Math.min(18, hits.length * 4), hits };
}

function detractors(low: string): { sub: number; hits: string[] } {
  const weak = [
    "residential only",
    "residential roofing",
    "salon",
    "daycare",
    "realtor",
    "coffee shop",
    "restaurant",
    "boutique",
    "nail salon",
    "bakery",
    "florist",
    "dentist",
    "orthodont",
    "chiropractic",
    "pet grooming",
  ];
  const hits = weak.filter((w) => low.includes(w));
  return { sub: Math.min(36, hits.length * 12), hits };
}

function clampScoreNum(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampScore(n: unknown): number | null {
  const score = typeof n === "number" ? Math.round(n) : Number.NaN;
  if (!Number.isFinite(score)) return null;
  return clampScoreNum(score);
}

function parseStringArray(v: unknown, maxLen: number, maxChars: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, maxChars);
    if (!s || out.some((x) => x.toLowerCase() === s.toLowerCase())) continue;
    out.push(s);
    if (out.length >= maxLen) break;
  }
  return out;
}

function mergeLikely(
  preset: string,
  equipmentType: string,
  text: string,
  extra: string[]
): string[] {
  const fromPreset = assetsForPreset(preset);
  const fromEquip = EQUIPMENT_TYPE_HINTS[equipmentType] ?? [];
  const hinted: string[] = [];
  const low = text.toLowerCase();
  for (const tag of ASSET_TAGS) {
    if (low.includes("scrap") && tag.includes("Scrap")) hinted.push(tag);
    if (
      low.includes("valve") &&
      tag.includes("Pipe")
    )
      hinted.push(tag);
    if (low.includes("breaker") && tag.includes("breakers")) hinted.push(tag);
    if (low.includes("transform") && tag.includes("Transform")) hinted.push(tag);
    if (
      low.includes("electrical") &&
      tag.includes("Electrical")
    )
      hinted.push(tag);
  }
  const merged = uniqPick([...extra, ...fromEquip, ...hinted, ...fromPreset], 8);
  return merged.length ? merged : [...fromPreset].slice(0, 5);
}

function heuristicScore(
  c: ScoreInput,
  ctx: { target_industry: string; equipment_type: string; city: string; state: string }
): LeadFinderScoreFields {
  const low = textBlob(c);
  let score = baselinePreset(ctx.target_industry);
  const { add, hits: opHits } = operationalBoosts(low);
  const { sub, hits: lowHits } = detractors(low);
  score += add - sub + (c.website ? 4 : 0) + (c.phone ? 2 : 0);
  score = clampScoreNum(score);

  const likely_asset_types = mergeLikely(ctx.target_industry, ctx.equipment_type, low, []);

  const primaryList = likely_asset_types.slice(0, 3).join(", ");
  const outreach_angle = primaryList.length
    ? `Offer paid removal/recycling + fair buyout for excess ${primaryList.toLowerCase()} after upgrades, teardowns, or yard cleanups—they do not need to advertise surplus publicly.`
    : `Offer to buy/remove industrial surplus accumulated from ${ctx.target_industry.toLowerCase()} work in ${ctx.city}, ${ctx.state}.`;

  const evidence: string[] = [];
  evidence.push(`Search target: ${ctx.target_industry} (${ctx.city}, ${ctx.state}).`);
  const gIndustry = (c.industry || "").trim();
  if (gIndustry) evidence.push(`Google-listed type/category: ${gIndustry}.`);
  if (opHits.length) evidence.push(`Signals (text): ${opHits.slice(0, 8).join(", ")}.`);
  if (lowHits.length)
    evidence.push(`Down-rank cues (avoid residential/unrelated positioning): ${lowHits.join(", ")}.`);
  if (c.enrichment_summary?.trim()) {
    evidence.push(`Public-site summary excerpt (non-fabricated): ${c.enrichment_summary.trim().slice(0, 220)}`);
  } else {
    evidence.push("Limited scraped website text — score relies mostly on preset + Google categories.");
  }

  evidence.push(
    "Does NOT require wording about selling surplus — only likelihood of holding/removing industrial assets."
  );

  const reason_selected = evidence.join(" ");

  return {
    asset_likelihood_score: score,
    likely_asset_types,
    outreach_angle,
    reason_selected,
    score,
    score_source: "heuristic",
    score_explanation: reason_selected,
  };
}

export async function scoreLeadFinderCandidate(
  candidate: ScoreInput,
  searchContext: {
    target_industry: string;
    equipment_type: string;
    city: string;
    state: string;
  }
): Promise<LeadFinderScoreFields> {
  const fallback = () => heuristicScore(candidate, searchContext);

  if (!isOpenAiConfigured()) return fallback();

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You evaluate whether a REAL business likely OWNS or ACCUMULATES industrial assets (potential sellers for a surplus buyer)—NOT whether they market surplus resale.
Do NOT penalize absence of phrases like “we sell surplus.” Competitors explicitly buy/resell surplus; ignore that framing.
Score 0–100 for likelihood they may generate excess, scrap, decommissioned, or removable industrial assets based ONLY on supplied facts (Google categories, optional website summary keywords). Never invent addresses, certs, fleet sizes, or inventory.
HIGH signals: equipment-heavy trades, utilities/energy plants, fabrication/manufacturing, demolition/cranes, mechanical/electrical/plumbing commercial work, shutdown/upgrade/removal/maintenance language, plant/factory/warehouse wording.
LOW signals: clearly residential-only, unrelated consumer services, or obvious irrelevance/futility.
Respond with JSON only:
{"asset_likelihood_score": number, "likely_asset_types": string[], "outreach_angle": string, "reason_selected": string}
likely_asset_types: 3–8 short labels (scrap, electrical surplus, transformers, machinery, pipe/valves, fleet, plant surplus).
outreach_angle: one concise cold-email angle focused on BUY / REMOVE / RECYCLE — no fabricated claims.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            buyer_context: {
              client: "Select Surplus LLC",
              buys: [
                "scrap metal",
                "electrical surplus",
                "switchgear",
                "breakers",
                "transformers",
                "machinery",
                "heavy equipment",
                "pipe & valves",
                "fleet vehicles",
                "warehouse/factory surplus",
              ],
            },
            search: {
              target_industry_preset: searchContext.target_industry,
              equipment_focus: searchContext.equipment_type,
              city: searchContext.city,
              state: searchContext.state,
            },
            candidate: {
              company_name: candidate.company_name,
              website: candidate.website || null,
              phone: candidate.phone || null,
              email: candidate.email || null,
              address: candidate.formatted_address || null,
              google_industry_primary: candidate.industry || null,
              google_source_url: candidate.source_url || null,
              enrichment_summary: candidate.enrichment_summary,
              keywords: candidate.keywords,
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const score = clampScore(parsed.asset_likelihood_score);
    if (score == null) return fallback();

    let likely = parseStringArray(parsed.likely_asset_types, 8, 80);
    if (!likely.length) {
      likely = mergeLikely(
        searchContext.target_industry,
        searchContext.equipment_type,
        textBlob(candidate),
        []
      );
    }

    const reasonRaw =
      typeof parsed.reason_selected === "string"
        ? parsed.reason_selected.trim()
        : "";
    const reason_selected = (
      reasonRaw.length ? reasonRaw : heuristicScore(candidate, searchContext).reason_selected
    ).slice(0, 2200);

    const angleRaw =
      typeof parsed.outreach_angle === "string" ? parsed.outreach_angle.trim() : "";
    const outreach_angle = angleRaw.length
      ? angleRaw.slice(0, 500)
      : heuristicScore(candidate, searchContext).outreach_angle;

    return {
      asset_likelihood_score: score,
      likely_asset_types: likely,
      outreach_angle,
      reason_selected,
      score,
      score_source: "ai",
      score_explanation: reason_selected,
    };
  } catch {
    return fallback();
  }
}
