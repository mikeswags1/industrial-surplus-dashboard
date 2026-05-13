import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";

export type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  state: string | null;
  city: string | null;
  lead_source: string | null;
  equipment_type: string | null;
  estimated_value: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[] | null;
  company_summary?: string | null;
  industry_detected?: string | null;
  keywords?: string[] | null;
};

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
