import type { SupabaseClient } from "@supabase/supabase-js";
import { getGooglePlacesConfig, isOpenAiConfigured } from "@/lib/env/server";
import { enrichFromWebsite } from "@/lib/enrichment/website";
import { searchGooglePlaces } from "@/lib/lead-finder/google-places";
import { scoreLeadFinderCandidate } from "@/lib/lead-finder/scoring";
import type {
  LeadFinderPlaceQuery,
  LeadFinderRunResponse,
  LeadFinderSearchInput,
  ProviderCandidate,
  ScoredCandidate,
} from "@/lib/lead-finder/types";
import {
  createLeadFinderRun,
  finishLeadFinderRun,
  insertLeadFinderCandidates,
} from "@/lib/repositories/lead-finder.repository";

/** Max category × state × city combinations per run (each combo = one Places request). */
export const LEAD_FINDER_MAX_COMBINATIONS = 24;
/** After dedupe, max rows we enrich + score to control latency and API cost. */
const MAX_SCORE_POOL = 45;

/** For "Select all" UX: max industries that fit under the cap with current geography. */
export function maxSelectableIndustries(stateCount: number, citySlotCount: number): number {
  const denom = Math.max(1, stateCount) * Math.max(1, citySlotCount);
  return Math.max(1, Math.floor(LEAD_FINDER_MAX_COMBINATIONS / denom));
}

/** For "All" states: max states that fit under the cap with current categories. */
export function maxSelectableStates(industryCount: number, citySlotCount: number): number {
  const denom = Math.max(1, industryCount) * Math.max(1, citySlotCount);
  return Math.max(1, Math.floor(LEAD_FINDER_MAX_COMBINATIONS / denom));
}

export function leadFinderSetup() {
  return {
    googlePlacesConfigured: Boolean(getGooglePlacesConfig()),
    openAiConfigured: isOpenAiConfigured(),
  };
}

function dedupeKey(c: ProviderCandidate): string {
  const id = c.provider_place_id?.trim();
  if (id) return `id:${id}`;
  const w = c.website?.trim().toLowerCase() ?? "";
  const name = c.company_name.trim().toLowerCase();
  return `f:${c.state}|${name}|${w}`;
}

type LeadFinderCombo = {
  target_industry: string;
  state: string;
  city: string;
};

function cartesianCombos(
  target_industries: string[],
  states: string[],
  cities: string[]
): LeadFinderCombo[] {
  const out: LeadFinderCombo[] = [];
  for (const target_industry of target_industries) {
    for (const state of states) {
      for (const city of cities) {
        out.push({ target_industry, state, city });
      }
    }
  }
  return out;
}

function dedupeTagged(
  rows: { c: ProviderCandidate; combo: LeadFinderCombo }[]
): { c: ProviderCandidate; combo: LeadFinderCombo }[] {
  const seen = new Set<string>();
  const out: { c: ProviderCandidate; combo: LeadFinderCombo }[] = [];
  for (const row of rows) {
    const k = dedupeKey(row.c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

async function enrichAndScore(
  candidate: ProviderCandidate,
  slice: Omit<LeadFinderPlaceQuery, "count">
): Promise<ScoredCandidate> {
  let enrichment_summary: string | null = null;
  let enrichment_source_url: string | null = null;
  let keywords: string[] = [];
  let email = candidate.email;

  if (candidate.website) {
    try {
      const enriched = await enrichFromWebsite(candidate.website);
      enrichment_summary = enriched.company_summary;
      enrichment_source_url = enriched.source_url;
      keywords = enriched.keywords;
      email = enriched.public_emails?.[0] ?? "";
    } catch {
      // Provider facts are still valid even if a site blocks or times out.
    }
  }

  const scoring = await scoreLeadFinderCandidate(
    {
      ...candidate,
      email,
      enrichment_summary,
      keywords,
    },
    {
      target_industry: slice.target_industry,
      equipment_type: slice.equipment_type,
      city: slice.city,
      state: slice.state,
    }
  );

  return {
    ...candidate,
    email,
    enrichment_summary,
    enrichment_source_url,
    keywords,
    target_industry: slice.target_industry.trim(),
    ...scoring,
  };
}

export async function runLeadFinder(
  admin: SupabaseClient,
  input: LeadFinderSearchInput
): Promise<LeadFinderRunResponse> {
  const target_industries = [...new Set(input.target_industries)];
  const states = [...new Set(input.states)];
  const cities = [...new Set(input.cities)];

  const normalized: LeadFinderSearchInput = {
    ...input,
    target_industries,
    states,
    cities,
  };

  const combos = cartesianCombos(
    normalized.target_industries,
    normalized.states,
    normalized.cities
  );
  if (combos.length > LEAD_FINDER_MAX_COMBINATIONS) {
    throw new Error(
      `Too many search combinations (${combos.length}). Select at most ${LEAD_FINDER_MAX_COMBINATIONS} category × state × city combinations, or run separate searches.`
    );
  }

  const run = await createLeadFinderRun(admin, normalized);
  try {
    const perComboPlaces = Math.min(
      20,
      Math.max(1, Math.ceil((normalized.count * 3) / Math.max(1, combos.length)))
    );

    const tagged: { c: ProviderCandidate; combo: LeadFinderCombo }[] = [];
    for (const combo of combos) {
      const slice: LeadFinderPlaceQuery = {
        ...combo,
        equipment_type: normalized.equipment_type,
        count: perComboPlaces,
      };
      const batch = await searchGooglePlaces(slice);
      for (const c of batch) tagged.push({ c, combo });
    }

    let merged = dedupeTagged(tagged);
    if (merged.length > MAX_SCORE_POOL) {
      merged = merged.slice(0, MAX_SCORE_POOL);
    }

    const scored: ScoredCandidate[] = [];
    for (const { c, combo } of merged) {
      scored.push(
        await enrichAndScore(c, {
          target_industry: combo.target_industry,
          equipment_type: normalized.equipment_type,
          city: combo.city,
          state: combo.state,
        })
      );
    }

    const sortScore = (c: ScoredCandidate) =>
      c.asset_likelihood_score ?? c.score ?? Number.NEGATIVE_INFINITY;

    scored.sort((a, b) => sortScore(b) - sortScore(a));
    const trimmed = scored.slice(0, normalized.count);

    const candidates = await insertLeadFinderCandidates(admin, run.id, trimmed);
    const finished = await finishLeadFinderRun(admin, run.id, {
      status: "completed",
      result_count: candidates.length,
    });

    return {
      run: finished,
      candidates,
      setup: leadFinderSetup(),
    };
  } catch (e) {
    await finishLeadFinderRun(admin, run.id, {
      status: "failed",
      error: e instanceof Error ? e.message : "Lead Finder failed",
    });
    throw e;
  }
}
