import type { ProjectSignalLeadRow } from "@/lib/database/types";
import type { ProjectSignalLead } from "@/lib/project-signals/types";

export function projectSignalRowToLead(row: ProjectSignalLeadRow): ProjectSignalLead {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_name: row.project_name,
    project_type: row.project_type,
    source_type: row.source_type,
    location: row.location ?? "",
    state: row.state ?? "",
    contact_name: row.contact_name ?? "",
    contact_email: row.contact_email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    source_url: row.source_url ?? "",
    project_status: row.project_status,
    estimated_value: row.estimated_value,
    estimated_start_date: row.estimated_start_date,
    estimated_completion_date: row.estimated_completion_date,
    equipment_opportunity: row.equipment_opportunity ?? "",
    confidence_score: row.confidence_score,
    lead_score: row.lead_score,
    reason_flagged: row.reason_flagged ?? "",
    notes: row.notes ?? "",
    lead_status: row.lead_status,
    is_demo: row.is_demo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
