import { US_STATES } from "@/lib/types";
import { displayNameForUsState } from "@/lib/geo/us-state-names";
import type { ProjectSignalProjectStatus } from "@/lib/project-signals/constants";
import type { NewsDiscoveryQuery } from "@/lib/project-signals/discovery/queries";
import { googleNewsRssUrl, parseRssItems } from "@/lib/project-signals/discovery/parse-rss";

export type DiscoveredProjectSignal = {
  project_name: string;
  project_type: string;
  source_type: "news";
  source_url: string;
  location: string;
  state: string;
  project_status: ProjectSignalProjectStatus;
  equipment_opportunity: string;
  notes: string;
  is_demo: false;
  lead_status: "New";
};

const STATE_NAME_TO_CODE = new Map<string, string>(
  US_STATES.map((code) => [displayNameForUsState(code).toLowerCase(), code])
);

function inferProjectStatus(title: string, description: string): ProjectSignalProjectStatus {
  const t = `${title} ${description}`.toLowerCase();
  if (/shutdown|closing|closure|idled|decommission/.test(t)) return "Shutdown announced";
  if (/breaks ground|groundbreaking|under construction|begins construction|starts building/.test(t))
    return "Under construction";
  if (/permit approved|wins approval|zoning approved|approved for/.test(t)) return "Permitted";
  if (/announces|plans to|proposes|will build| slated /.test(t)) return "Planned";
  if (/near completion|nearing completion|opens new/.test(t)) return "Near completion";
  return "Unknown";
}

function guessState(text: string, preferState?: string): string {
  if (preferState && US_STATES.includes(preferState as (typeof US_STATES)[number])) {
    return preferState;
  }
  const upper = text.toUpperCase();
  for (const code of US_STATES) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(upper)) return code;
  }
  const lower = text.toLowerCase();
  for (const [name, code] of STATE_NAME_TO_CODE) {
    if (lower.includes(name)) return code;
  }
  return "";
}

function guessLocation(title: string, description: string): string {
  const blob = `${title}. ${description}`;
  const m = blob.match(/\b(?:in|near|outside)\s+([A-Za-z][A-Za-z\s.-]{2,40}?)(?:,|\s+(?:TX|CA|NY|FL|VA|OH|PA|GA|NC|IL|MI|NJ|AZ|CO|WA|MD|IN|TN|MO|WI|MN|SC|AL|LA|KY|OK|OR|CT|IA|MS|AR|KS|UT|NV|NM|NE|WV|ID|HI|NH|ME|RI|MT|DE|SD|ND|AK|VT|WY|DC)\b)/i);
  return m?.[1]?.trim() ?? "";
}

function isLikelyRelevant(title: string, description: string): boolean {
  const t = `${title} ${description}`.toLowerCase();
  if (t.length < 20) return false;
  const noise =
    /stock price|earnings|quarterly results|crypto|bitcoin|sports|celebrity|movie|game release|iphone|android app/.test(
      t
    );
  if (noise) return false;
  const signal =
    /data center|hyperscale|campus|factory|plant|shutdown|closure|demolition|substation|utility|manufacturing|industrial|warehouse|construction|groundbreaking|relocation|upgrade|surplus|decommission/.test(
      t
    );
  return signal;
}

export async function discoverFromGoogleNews(
  query: NewsDiscoveryQuery,
  options?: { stateFilter?: string; maxItems?: number }
): Promise<DiscoveredProjectSignal[]> {
  let searchQ = query.q;
  if (options?.stateFilter) {
    searchQ += ` ${displayNameForUsState(options.stateFilter)}`;
  }
  searchQ += " when:3m";

  const url = googleNewsRssUrl(searchQ);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let xml = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SelectSurplusProjectDiscovery/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 0 },
    });
    xml = await res.text();
    if (!res.ok) {
      throw new Error(`News feed HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }

  const maxItems = options?.maxItems ?? 6;
  const out: DiscoveredProjectSignal[] = [];

  for (const item of parseRssItems(xml).slice(0, maxItems)) {
    if (!isLikelyRelevant(item.title, item.description)) continue;

    const state = guessState(`${item.title} ${item.description}`, options?.stateFilter);
    const location = guessLocation(item.title, item.description);
    const project_status = inferProjectStatus(item.title, item.description);

    out.push({
      project_name: item.title.slice(0, 500),
      project_type: query.project_type,
      source_type: "news",
      source_url: item.link,
      location,
      state,
      project_status,
      equipment_opportunity: query.equipment_opportunity,
      notes: item.description
        ? `Auto-discovered from news (${item.pubDate || "recent"}). ${item.description.slice(0, 400)}`
        : `Auto-discovered from news (${item.pubDate || "recent"}).`,
      is_demo: false,
      lead_status: "New",
    });
  }

  return out;
}
