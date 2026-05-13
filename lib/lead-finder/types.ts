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

export type LeadFinderSearchInput = {
  state: string;
  city: string;
  industry: string;
  equipment_type: string;
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
  score: number | null;
  score_source: LeadFinderScoreSource;
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
