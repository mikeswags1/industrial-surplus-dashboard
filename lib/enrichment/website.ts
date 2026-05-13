/**
 * Website text extraction + light heuristics.
 * Replace body with paid enrichment APIs later; keep interface stable.
 */

const INDUSTRY_KEYWORDS: { industry: string; words: string[] }[] = [
  { industry: "Manufacturing", words: ["manufacturing", "fabrication", "cnc", "assembly"] },
  { industry: "Electrical / MRO", words: ["electrical", "breaker", "switchgear", "mro", "automation"] },
  { industry: "Logistics / Warehouse", words: ["warehouse", "logistics", "distribution", "forklift", "pallet"] },
  { industry: "Metal / Scrap", words: ["scrap", "metal", "recycling", "steel", "aluminum"] },
  { industry: "Construction", words: ["construction", "contractor", "heavy equipment"] },
];

export type WebsiteEnrichment = {
  company_summary: string;
  industry_detected: string;
  keywords: string[];
  source_url: string;
};

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickDescription(text: string) {
  const t = text.slice(0, 4000);
  const og = t.match(/property=["']og:description["'][^>]*content=["']([^"']+)/i);
  if (og?.[1]) return og[1].slice(0, 500);
  const m = t.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)/i);
  if (m?.[1]) return m[1].slice(0, 500);
  return t.slice(0, 500);
}

export async function enrichFromWebsite(url: string): Promise<WebsiteEnrichment> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  let html = "";
  try {
    const res = await fetch(normalized, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "IndustrialSurplusDashboard/1.0 (+https://example.invalid)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(t);
  }

  const text = stripTags(html).toLowerCase();
  const snippet = pickDescription(html) || stripTags(html).slice(0, 400);

  let industry_detected = "Unknown";
  let best = 0;
  for (const row of INDUSTRY_KEYWORDS) {
    const score = row.words.reduce((s, w) => (text.includes(w) ? s + 1 : s), 0);
    if (score > best) {
      best = score;
      industry_detected = row.industry;
    }
  }

  const keywords = Array.from(
    new Set(
      text
        .split(/\W+/)
        .filter((w) => w.length > 4 && w.length < 24)
        .slice(0, 40)
    )
  ).slice(0, 20);

  return {
    company_summary: snippet.trim() || "No description extracted.",
    industry_detected,
    keywords,
    source_url: normalized,
  };
}
