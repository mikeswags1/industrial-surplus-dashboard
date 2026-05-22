import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DISCOVERY_MAX_INSERTS_PER_RUN,
  DISCOVERY_MAX_ITEMS_PER_QUERY,
  NEWS_DISCOVERY_QUERIES,
} from "@/lib/project-signals/discovery/queries";
import { discoverFromGoogleNews, type DiscoveredProjectSignal } from "@/lib/project-signals/discovery/news";
import { insertProjectSignalLead } from "@/lib/repositories/project-signals.repository";

export type DiscoveryRunResult = {
  scanned_queries: number;
  candidates_found: number;
  inserted: number;
  skipped_duplicate: number;
  skipped_low_quality: number;
  errors: string[];
  sample_titles: string[];
};

export async function fetchExistingSourceUrls(
  admin: SupabaseClient,
  urls: string[]
): Promise<Set<string>> {
  const clean = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (!clean.length) return new Set();
  const { data, error } = await admin
    .from("project_signal_leads")
    .select("source_url")
    .in("source_url", clean);
  if (error) throw new Error(error.message);
  return new Set(
    ((data ?? []) as { source_url: string | null }[])
      .map((r) => r.source_url?.trim())
      .filter(Boolean) as string[]
  );
}

function dedupeCandidates(rows: DiscoveredProjectSignal[]): DiscoveredProjectSignal[] {
  const seen = new Set<string>();
  const out: DiscoveredProjectSignal[] = [];
  for (const row of rows) {
    const key = row.source_url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export async function runProjectSignalDiscovery(
  admin: SupabaseClient,
  options?: { stateFilter?: string }
): Promise<DiscoveryRunResult> {
  const errors: string[] = [];
  const collected: DiscoveredProjectSignal[] = [];

  for (const query of NEWS_DISCOVERY_QUERIES) {
    try {
      const batch = await discoverFromGoogleNews(query, {
        stateFilter: options?.stateFilter,
        maxItems: DISCOVERY_MAX_ITEMS_PER_QUERY,
      });
      collected.push(...batch);
    } catch (e) {
      errors.push(
        `${query.project_type}: ${e instanceof Error ? e.message : "fetch failed"}`
      );
    }
  }

  const candidates = dedupeCandidates(collected);
  const urls = candidates.map((c) => c.source_url);
  const existing = await fetchExistingSourceUrls(admin, urls);

  let inserted = 0;
  let skipped_duplicate = 0;
  let skipped_low_quality = 0;

  for (const candidate of candidates) {
    if (inserted >= DISCOVERY_MAX_INSERTS_PER_RUN) break;

    const url = candidate.source_url.trim();
    if (!url) {
      skipped_low_quality++;
      continue;
    }
    if (existing.has(url)) {
      skipped_duplicate++;
      continue;
    }
    if (!candidate.project_name.trim()) {
      skipped_low_quality++;
      continue;
    }

    try {
      await insertProjectSignalLead(admin, {
        ...candidate,
        contact_name: "",
        contact_email: "",
        phone: "",
        website: "",
        estimated_value: null,
        estimated_start_date: null,
        estimated_completion_date: null,
      });
      existing.add(url);
      inserted++;
    } catch (e) {
      errors.push(
        `Insert "${candidate.project_name.slice(0, 60)}": ${e instanceof Error ? e.message : "failed"}`
      );
    }
  }

  return {
    scanned_queries: NEWS_DISCOVERY_QUERIES.length,
    candidates_found: candidates.length,
    inserted,
    skipped_duplicate,
    skipped_low_quality,
    errors,
    sample_titles: candidates.slice(0, 5).map((c) => c.project_name),
  };
}
