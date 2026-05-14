import type { SupabaseClient } from "@supabase/supabase-js";
import { getGooglePlacesConfig, isOpenAiConfigured } from "@/lib/env/server";
import { enrichFromWebsite } from "@/lib/enrichment/website";
import { searchGooglePlaces } from "@/lib/lead-finder/google-places";
import { scoreLeadFinderCandidate } from "@/lib/lead-finder/scoring";
import type {
  LeadFinderRunResponse,
  LeadFinderSearchInput,
  ScoredCandidate,
} from "@/lib/lead-finder/types";
import {
  createLeadFinderRun,
  finishLeadFinderRun,
  insertLeadFinderCandidates,
} from "@/lib/repositories/lead-finder.repository";

export function leadFinderSetup() {
  return {
    googlePlacesConfigured: Boolean(getGooglePlacesConfig()),
    openAiConfigured: isOpenAiConfigured(),
  };
}

async function enrichAndScore(
  candidate: Awaited<ReturnType<typeof searchGooglePlaces>>[number],
  input: LeadFinderSearchInput
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
      target_industry: input.target_industry,
      equipment_type: input.equipment_type,
      city: input.city,
      state: input.state,
    }
  );

  return {
    ...candidate,
    email,
    enrichment_summary,
    enrichment_source_url,
    keywords,
    target_industry: input.target_industry.trim(),
    ...scoring,
  };
}

export async function runLeadFinder(
  admin: SupabaseClient,
  input: LeadFinderSearchInput
): Promise<LeadFinderRunResponse> {
  const run = await createLeadFinderRun(admin, input);
  try {
    const providerCandidates = await searchGooglePlaces(input);
    const scored: ScoredCandidate[] = [];

    for (const candidate of providerCandidates) {
      scored.push(await enrichAndScore(candidate, input));
    }

    const candidates = await insertLeadFinderCandidates(admin, run.id, scored);
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
