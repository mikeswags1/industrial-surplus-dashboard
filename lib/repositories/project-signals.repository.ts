import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectSignalLeadRow } from "@/lib/database/types";
import { projectSignalRowToLead } from "@/lib/project-signals/mappers";
import { scoreProjectSignalLead } from "@/lib/project-signals/scoring";
import type {
  ProjectSignalLead,
  ProjectSignalLeadInput,
  ProjectSignalListFilters,
} from "@/lib/project-signals/types";
import { validateProjectSignalSource } from "@/lib/project-signals/csv";

const MAX_LIST = 2000;
const DEFAULT_LIST = 500;

export function clampProjectSignalListParams(limitRaw: string | null, offsetRaw: string | null) {
  const limit = Math.min(
    MAX_LIST,
    Math.max(1, Number.parseInt(limitRaw ?? "", 10) || DEFAULT_LIST)
  );
  const offset = Math.max(0, Number.parseInt(offsetRaw ?? "", 10) || 0);
  return { limit, offset };
}

function rowFromInput(
  input: ProjectSignalLeadInput,
  scores: ReturnType<typeof scoreProjectSignalLead>
) {
  return {
    project_name: input.project_name.trim(),
    project_type: input.project_type.trim(),
    source_type: input.is_demo ? "demo" : input.source_type,
    location: input.location?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    contact_name: input.contact_name?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    phone: input.phone?.trim() || null,
    website: input.website?.trim() || null,
    source_url: input.source_url?.trim() || null,
    project_status: input.project_status?.trim() || "Unknown",
    estimated_value: input.estimated_value ?? null,
    estimated_start_date: input.estimated_start_date || null,
    estimated_completion_date: input.estimated_completion_date || null,
    equipment_opportunity: input.equipment_opportunity?.trim() || null,
    confidence_score: input.confidence_score ?? scores.confidence_score,
    lead_score: input.lead_score ?? scores.lead_score,
    reason_flagged: input.reason_flagged?.trim() || scores.reason_flagged,
    notes: input.notes?.trim() || null,
    lead_status: input.lead_status,
    is_demo: Boolean(input.is_demo),
  };
}

export async function fetchProjectSignalLeads(
  admin: SupabaseClient,
  filters: ProjectSignalListFilters,
  limit: number,
  offset: number
): Promise<ProjectSignalLead[]> {
  let q = admin
    .from("project_signal_leads")
    .select("*")
    .order("lead_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.state?.trim()) q = q.eq("state", filters.state.trim().toUpperCase());
  if (filters.project_type?.trim()) q = q.eq("project_type", filters.project_type.trim());
  if (filters.source_type?.trim()) q = q.eq("source_type", filters.source_type.trim());
  if (filters.lead_status?.trim()) q = q.eq("lead_status", filters.lead_status.trim());
  if (filters.min_confidence != null && Number.isFinite(filters.min_confidence)) {
    q = q.gte("confidence_score", filters.min_confidence);
  }
  if (filters.min_lead_score != null && Number.isFinite(filters.min_lead_score)) {
    q = q.gte("lead_score", filters.min_lead_score);
  }
  if (filters.created_from?.trim()) {
    q = q.gte("created_at", `${filters.created_from.trim()}T00:00:00.000Z`);
  }
  if (filters.created_to?.trim()) {
    q = q.lte("created_at", `${filters.created_to.trim()}T23:59:59.999Z`);
  }
  if (filters.q?.trim()) {
    q = q.ilike("project_name", `%${filters.q.trim()}%`);
  }

  const end = offset + limit - 1;
  const { data, error } = await q.range(offset, end);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProjectSignalLeadRow[]).map(projectSignalRowToLead);
}

export async function fetchProjectSignalLeadById(
  admin: SupabaseClient,
  id: string
): Promise<ProjectSignalLead | null> {
  const { data, error } = await admin
    .from("project_signal_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return projectSignalRowToLead(data as ProjectSignalLeadRow);
}

export async function insertProjectSignalLead(
  admin: SupabaseClient,
  input: ProjectSignalLeadInput
): Promise<ProjectSignalLead> {
  const sourceErr = validateProjectSignalSource(input);
  if (sourceErr) throw new Error(sourceErr);
  if (!input.project_name?.trim()) throw new Error("project_name required");
  if (!input.project_type?.trim()) throw new Error("project_type required");

  const scores = scoreProjectSignalLead(input);
  const row = rowFromInput(input, scores);

  const { data, error } = await admin
    .from("project_signal_leads")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return projectSignalRowToLead(data as ProjectSignalLeadRow);
}

const PATCH_FIELDS: (keyof ProjectSignalLeadInput)[] = [
  "project_name",
  "project_type",
  "source_type",
  "location",
  "state",
  "contact_name",
  "contact_email",
  "phone",
  "website",
  "source_url",
  "project_status",
  "estimated_value",
  "estimated_start_date",
  "estimated_completion_date",
  "equipment_opportunity",
  "notes",
  "lead_status",
  "is_demo",
];

export async function updateProjectSignalLead(
  admin: SupabaseClient,
  id: string,
  patch: Partial<ProjectSignalLeadInput>
): Promise<ProjectSignalLead | "not_found" | "empty_patch"> {
  const keys = PATCH_FIELDS.filter((k) => patch[k] !== undefined);
  if (!keys.length) return "empty_patch";

  const existing = await fetchProjectSignalLeadById(admin, id);
  if (!existing) return "not_found";

  const merged: ProjectSignalLeadInput = {
    project_name: patch.project_name ?? existing.project_name,
    project_type: patch.project_type ?? existing.project_type,
    source_type: patch.source_type ?? existing.source_type,
    location: patch.location ?? existing.location,
    state: patch.state ?? existing.state,
    contact_name: patch.contact_name ?? existing.contact_name,
    contact_email: patch.contact_email ?? existing.contact_email,
    phone: patch.phone ?? existing.phone,
    website: patch.website ?? existing.website,
    source_url: patch.source_url ?? existing.source_url,
    project_status: patch.project_status ?? existing.project_status,
    estimated_value: patch.estimated_value !== undefined ? patch.estimated_value : existing.estimated_value,
    estimated_start_date:
      patch.estimated_start_date !== undefined
        ? patch.estimated_start_date
        : existing.estimated_start_date,
    estimated_completion_date:
      patch.estimated_completion_date !== undefined
        ? patch.estimated_completion_date
        : existing.estimated_completion_date,
    equipment_opportunity: patch.equipment_opportunity ?? existing.equipment_opportunity,
    notes: patch.notes ?? existing.notes,
    lead_status: patch.lead_status ?? existing.lead_status,
    is_demo: patch.is_demo ?? existing.is_demo,
  };

  const sourceErr = validateProjectSignalSource(merged);
  if (sourceErr) throw new Error(sourceErr);

  const scores = scoreProjectSignalLead(merged);
  const row = rowFromInput(merged, scores);

  const { data, error } = await admin
    .from("project_signal_leads")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return projectSignalRowToLead(data as ProjectSignalLeadRow);
}

export async function deleteProjectSignalLead(
  admin: SupabaseClient,
  id: string
): Promise<"ok" | "not_found"> {
  const { data, error } = await admin
    .from("project_signal_leads")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? "ok" : "not_found";
}

export async function fetchAllProjectSignalsForExport(
  admin: SupabaseClient,
  filters: ProjectSignalListFilters
): Promise<ProjectSignalLead[]> {
  return fetchProjectSignalLeads(admin, filters, MAX_LIST, 0);
}
