import type { ProjectSignalLeadInput, ProjectSignalScores } from "@/lib/project-signals/types";

const TYPE_SURPLUS_WEIGHT: Record<string, number> = {
  "Data center construction": 92,
  "AI / cloud / hyperscale campus": 95,
  "Electrical contractor project": 78,
  "Utility upgrade": 82,
  "Plant closure": 90,
  "Factory shutdown": 93,
  "Facility expansion": 70,
  "Demolition project": 88,
  "Industrial relocation": 85,
  "Equipment replacement": 80,
  "Manufacturing expansion": 72,
};

const SOURCE_CONFIDENCE: Record<string, number> = {
  manual: 55,
  csv_import: 60,
  demo: 10,
  construction_permit: 85,
  planning_board: 80,
  zoning: 78,
  news: 65,
  contractor_page: 70,
  utility_filing: 82,
  job_post: 58,
  company_announcement: 72,
};

const ELECTRICAL_KEYWORDS =
  /switchgear|transformer|mcc|breaker|wire|cable|generator|electrical|scrap|surplus|removal|demolition|shutdown|closure/i;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hasContact(input: Pick<ProjectSignalLeadInput, "contact_email" | "phone" | "website">): boolean {
  return Boolean(
    input.contact_email?.trim() || input.phone?.trim() || input.website?.trim()
  );
}

function projectPhaseBoost(status: string): number {
  switch (status) {
    case "Under construction":
      return 8;
    case "Near completion":
      return 12;
    case "Shutdown announced":
      return 15;
    case "Permitted":
      return 6;
    case "Planned":
      return 3;
    default:
      return 0;
  }
}

/** Heuristic scores until automated feeds + AI scoring land. */
export function scoreProjectSignalLead(
  input: Pick<
    ProjectSignalLeadInput,
    | "project_type"
    | "source_type"
    | "project_status"
    | "equipment_opportunity"
    | "source_url"
    | "contact_email"
    | "phone"
    | "website"
    | "estimated_value"
    | "is_demo"
    | "notes"
  >
): ProjectSignalScores {
  const typeKey = input.project_type?.trim() ?? "";
  let lead = TYPE_SURPLUS_WEIGHT[typeKey] ?? 55;
  let confidence = SOURCE_CONFIDENCE[input.source_type] ?? 50;

  lead += projectPhaseBoost(input.project_status?.trim() ?? "Unknown");

  const equip = input.equipment_opportunity?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  if (ELECTRICAL_KEYWORDS.test(equip)) lead += 6;
  if (ELECTRICAL_KEYWORDS.test(notes)) lead += 3;

  if (hasContact(input)) {
    confidence += 8;
    lead += 4;
  }
  if (input.contact_email?.trim()) confidence += 5;

  if (input.source_url?.trim()) confidence += 10;
  if (input.estimated_value != null && input.estimated_value > 0) lead += 4;

  if (input.is_demo) {
    confidence = Math.min(confidence, 15);
    lead = Math.min(lead, 25);
  }

  const reasonParts: string[] = [];
  reasonParts.push(`Project type: ${typeKey || "unspecified"}.`);
  reasonParts.push(`Source: ${input.source_type.replace(/_/g, " ")}.`);
  if (input.project_status && input.project_status !== "Unknown") {
    reasonParts.push(`Phase: ${input.project_status}.`);
  }
  if (equip) reasonParts.push(`Equipment angle: ${equip.slice(0, 120)}.`);
  if (input.is_demo) reasonParts.push("Marked as demo/sample — not a verified live signal.");

  return {
    confidence_score: clamp(confidence),
    lead_score: clamp(lead),
    reason_flagged: reasonParts.join(" "),
  };
}
