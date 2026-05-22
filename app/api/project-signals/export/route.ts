import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { projectSignalsToCsv } from "@/lib/project-signals/csv";
import type { ProjectSignalListFilters } from "@/lib/project-signals/types";
import { fetchAllProjectSignalsForExport } from "@/lib/repositories/project-signals.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

function parseFilters(searchParams: URLSearchParams): ProjectSignalListFilters {
  const minConf = searchParams.get("min_confidence");
  const minLead = searchParams.get("min_lead_score");
  return {
    state: searchParams.get("state") ?? undefined,
    project_type: searchParams.get("project_type") ?? undefined,
    source_type: searchParams.get("source_type") ?? undefined,
    lead_status: searchParams.get("lead_status") ?? undefined,
    min_confidence: minConf ? Number(minConf) : undefined,
    min_lead_score: minLead ? Number(minLead) : undefined,
    created_from: searchParams.get("created_from") ?? undefined,
    created_to: searchParams.get("created_to") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    const leads = await fetchAllProjectSignalsForExport(admin, filters);

    const rows = leads.map((l) => ({
      project_name: l.project_name,
      project_type: l.project_type,
      source_type: l.source_type,
      location: l.location,
      state: l.state,
      contact_name: l.contact_name,
      contact_email: l.contact_email,
      phone: l.phone,
      website: l.website,
      source_url: l.source_url,
      project_status: l.project_status,
      estimated_value: l.estimated_value ?? "",
      estimated_start_date: l.estimated_start_date ?? "",
      estimated_completion_date: l.estimated_completion_date ?? "",
      equipment_opportunity: l.equipment_opportunity,
      notes: l.notes,
      lead_status: l.lead_status,
      is_demo: l.is_demo ? "true" : "false",
      confidence_score: l.confidence_score,
      lead_score: l.lead_score,
      reason_flagged: l.reason_flagged,
      created_at: l.created_at,
    }));

    const csv = projectSignalsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="project-signals-${stamp}.csv"`,
      },
    });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
