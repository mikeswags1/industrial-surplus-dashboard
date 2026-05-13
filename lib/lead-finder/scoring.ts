import OpenAI from "openai";
import { isOpenAiConfigured } from "@/lib/env/server";
import type { ScoredCandidate, ProviderCandidate } from "@/lib/lead-finder/types";

type ScoreInput = ProviderCandidate & {
  enrichment_summary: string | null;
  keywords: string[];
};

function clampScore(n: unknown): number | null {
  const score = typeof n === "number" ? Math.round(n) : Number.NaN;
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}

function heuristicScore(c: ScoreInput): Pick<
  ScoredCandidate,
  "score" | "score_source" | "score_explanation"
> {
  const text = [
    c.company_name,
    c.industry,
    c.formatted_address,
    c.enrichment_summary ?? "",
    c.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const strong = [
    "manufactur",
    "industrial",
    "warehouse",
    "fabrication",
    "machinery",
    "electrical",
    "automation",
    "metal",
    "distribution",
  ];
  const weak = ["contractor", "supplier", "equipment", "plant", "logistics"];
  const matched = [
    ...strong.filter((w) => text.includes(w)),
    ...weak.filter((w) => text.includes(w)),
  ];
  const score = Math.min(
    82,
    35 +
      strong.filter((w) => text.includes(w)).length * 9 +
      weak.filter((w) => text.includes(w)).length * 4 +
      (c.website ? 8 : 0) +
      (c.phone ? 5 : 0)
  );

  return {
    score,
    score_source: "heuristic",
    score_explanation: matched.length
      ? `Heuristic fit based on real provider/enrichment terms: ${matched.slice(0, 6).join(", ")}.`
      : "Heuristic fit from real provider data; not enough industrial terms for a high score.",
  };
}

export async function scoreLeadFinderCandidate(
  candidate: ScoreInput,
  searchContext: {
    industry: string;
    equipment_type: string;
    city: string;
    state: string;
  }
): Promise<Pick<ScoredCandidate, "score" | "score_source" | "score_explanation">> {
  if (!isOpenAiConfigured()) return heuristicScore(candidate);

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Score real public business records for fit as industrial surplus seller leads. Use only supplied facts. Never invent company names, emails, phones, websites, addresses, or claims. Return strict JSON with score 0-100 and explanation.",
        },
        {
          role: "user",
          content: JSON.stringify({
            target: searchContext,
            candidate: {
              company_name: candidate.company_name,
              website: candidate.website || null,
              phone: candidate.phone || null,
              email: candidate.email || null,
              address: candidate.formatted_address || null,
              industry: candidate.industry || null,
              source_url: candidate.source_url || null,
              enrichment_summary: candidate.enrichment_summary,
              keywords: candidate.keywords,
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return heuristicScore(candidate);
    const parsed = JSON.parse(raw) as {
      score?: unknown;
      explanation?: unknown;
    };
    const score = clampScore(parsed.score);
    if (score == null) return heuristicScore(candidate);
    const explanation =
      typeof parsed.explanation === "string" && parsed.explanation.trim()
        ? parsed.explanation.trim().slice(0, 700)
        : "AI scored this lead from real provider and enrichment facts.";
    return { score, score_source: "ai", score_explanation: explanation };
  } catch {
    return heuristicScore(candidate);
  }
}
