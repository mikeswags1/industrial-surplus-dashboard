import type { SupabaseClient } from "@supabase/supabase-js";
import {
  leadInputToInsert,
  leadRowToLead,
  type LeadRow,
} from "@/lib/db/mappers";
import { normalizeDedupeKey } from "@/lib/leads/csv";
import type { Lead } from "@/lib/types";

const MAX_LIST = 2000;
const DEFAULT_LIST = 500;

export function clampLeadListParams(limitRaw: string | null, offsetRaw: string | null) {
  const limit = Math.min(
    MAX_LIST,
    Math.max(1, Number.parseInt(limitRaw ?? "", 10) || DEFAULT_LIST)
  );
  const offset = Math.max(0, Number.parseInt(offsetRaw ?? "", 10) || 0);
  return { limit, offset };
}

export async function queryExistingDedupeKeys(
  admin: SupabaseClient,
  maxRows = 5000
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("leads")
    .select("email, company_name")
    .limit(maxRows);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const e = (r.email as string | null)?.trim();
    const c = (r.company_name as string)?.trim();
    if (e && c) seen.add(normalizeDedupeKey(e, c));
  }
  return seen;
}

export async function fetchLeads(
  admin: SupabaseClient,
  limit: number,
  offset: number
): Promise<Lead[]> {
  const end = offset + limit - 1;
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, end);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => leadRowToLead(r as LeadRow));
}

export async function insertLeadRow(
  admin: SupabaseClient,
  input: Omit<Lead, "id" | "created_at" | "updated_at">
): Promise<Lead> {
  const row = leadInputToInsert(input);
  const { data, error } = await admin.from("leads").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return leadRowToLead(data as LeadRow);
}

const LEAD_PATCH_MAP: [keyof Lead, string][] = [
  ["company_name", "company_name"],
  ["contact_name", "contact_name"],
  ["email", "email"],
  ["phone", "phone"],
  ["website", "website"],
  ["industry", "industry"],
  ["state", "state"],
  ["city", "city"],
  ["lead_source", "lead_source"],
  ["equipment_type", "equipment_type"],
  ["estimated_value", "estimated_value"],
  ["status", "status"],
  ["notes", "notes"],
  ["tags", "tags"],
  ["company_summary", "company_summary"],
  ["industry_detected", "industry_detected"],
  ["keywords", "keywords"],
];

export function leadPatchToColumns(patch: Partial<Lead>): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {};
  for (const [k, col] of LEAD_PATCH_MAP) {
    if (k in patch && patch[k] !== undefined) dbPatch[col] = patch[k];
  }
  return dbPatch;
}

export async function updateLeadRow(
  admin: SupabaseClient,
  id: string,
  patch: Partial<Lead>
): Promise<Lead | "not_found" | "empty_patch"> {
  const dbPatch = leadPatchToColumns(patch);
  if (Object.keys(dbPatch).length === 0) return "empty_patch";
  const { data, error } = await admin
    .from("leads")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "not_found" as const;
  return leadRowToLead(data as LeadRow);
}
