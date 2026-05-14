import type {
  LeadFinderCandidateRow,
  LeadFinderRunRow,
} from "@/lib/database/types";
import type { LeadFinderCandidate, LeadFinderRun } from "@/lib/lead-finder/types";

export function leadFinderRunRowToRun(row: LeadFinderRunRow): LeadFinderRun {
  return row;
}

export function leadFinderCandidateRowToCandidate(
  row: LeadFinderCandidateRow
): LeadFinderCandidate {
  return {
    ...row,
    raw_provider: row.raw_provider ?? {},
    keywords: row.keywords ?? [],
    likely_asset_types: row.likely_asset_types ?? [],
  };
}
