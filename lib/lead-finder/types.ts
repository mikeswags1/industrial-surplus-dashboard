import type {
  LeadFinderCandidateRow,
  LeadFinderRunRow,
} from "@/lib/database/types";

export type LeadFinderProvider = "google_places";
export type LeadFinderScoreSource = "ai" | "heuristic" | "unscored";
export type LeadFinderCandidateStatus =
  | "preview"
  | "approved"
  | "rejected"
  | "duplicate"
  | "error";

/** Single Google Places query + scoring slice (one category × one city × one state). */
export type LeadFinderPlaceQuery = {
  state: string;
  city: string;
  /** One of LEAD_FINDER_TARGET_INDUSTRIES labels — companies likely to hold surplus assets. */
  target_industry: string;
  equipment_type: string;
  /** Results to request from Places for this slice (1–20). */
  count: number;
};

/**
 * Batch search: cartesian product of categories × states × cities.
 * The engine dedupes across slices, scores candidates, and returns up to `count` rows.
 */
export type LeadFinderSearchInput = {
  states: string[];
  cities: string[];
  target_industries: string[];
  equipment_type: string;
  /** Max candidates to return after scoring (1–20). */
  count: number;
};

export type ProviderCandidate = {
  provider: LeadFinderProvider;
  provider_place_id: string | null;
  company_name: string;
  website: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  formatted_address: string;
  industry: string;
  source_url: string;
  raw_provider: Record<string, unknown>;
};

export type ScoredCandidate = ProviderCandidate & {
  enrichment_summary: string | null;
  enrichment_source_url: string | null;
  keywords: string[];
  /** Preset category used for this search (Select Surplus buy-side targeting). */
  target_industry: string;
  /** 0–100: likelihood the business may own excess / scrap / removable industrial assets. */
  asset_likelihood_score: number | null;
  likely_asset_types: string[];
  /** Suggested cold-email angle (buy, remove, recycle). */
  outreach_angle: string | null;
  /** Evidence-based “why this lead” — must not invent facts. */
  reason_selected: string | null;
  /** Legacy sort column; mirrors asset_likelihood_score when set. */
  score: number | null;
  score_source: LeadFinderScoreSource;
  /** Legacy field; mirrors reason_selected when set. */
  score_explanation: string | null;
};

export type LeadFinderRun = LeadFinderRunRow;
export type LeadFinderCandidate = LeadFinderCandidateRow;

export type LeadFinderRunResponse = {
  run: LeadFinderRun;
  candidates: LeadFinderCandidate[];
  setup?: {
    googlePlacesConfigured: boolean;
    openAiConfigured: boolean;
  };
};
