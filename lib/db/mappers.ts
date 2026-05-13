import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import type { LeadRow } from "@/lib/database/types";

export type { LeadRow } from "@/lib/database/types";

function coerceStatus(s: string): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(s)
    ? (s as LeadStatus)
    : "New";
}

export function leadRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    company_name: row.company_name,
    contact_name: row.contact_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    industry: row.industry ?? "",
    state: row.state ?? "",
    city: row.city ?? "",
    lead_source: row.lead_source ?? "Manual",
    equipment_type: row.equipment_type ?? "Mixed / other",
    estimated_value: row.estimated_value,
    status: coerceStatus(row.status),
    notes: row.notes ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: row.tags ?? [],
    company_summary: row.company_summary ?? null,
    industry_detected: row.industry_detected ?? null,
    keywords: row.keywords ?? [],
    organization_id: row.organization_id ?? undefined,
  };
}

export function leadInputToInsert(
  input: Omit<Lead, "id" | "created_at" | "updated_at">
) {
  return {
    company_name: input.company_name,
    contact_name: input.contact_name || null,
    email: input.email || null,
    phone: input.phone || null,
    website: input.website || null,
    industry: input.industry || null,
    state: input.state || null,
    city: input.city || null,
    lead_source: input.lead_source || "Manual",
    equipment_type: input.equipment_type || null,
    estimated_value: input.estimated_value,
    status: input.status,
    notes: input.notes || null,
    tags: input.tags?.length ? input.tags : [],
    company_summary: input.company_summary ?? null,
    industry_detected: input.industry_detected ?? null,
    keywords: input.keywords?.length ? input.keywords : [],
  };
}
