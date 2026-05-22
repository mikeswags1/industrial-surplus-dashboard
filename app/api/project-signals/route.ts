import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import type { ProjectSignalListFilters } from "@/lib/project-signals/types";
import {
  clampProjectSignalListParams,
  fetchProjectSignalLeads,
  insertProjectSignalLead,
} from "@/lib/repositories/project-signals.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectSignalLeadInput } from "@/lib/project-signals/types";

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
    const { limit, offset } = clampProjectSignalListParams(
      searchParams.get("limit"),
      searchParams.get("offset")
    );
    const filters = parseFilters(searchParams);
    const leads = await fetchProjectSignalLeads(admin, filters, limit, offset);
    return NextResponse.json({ leads, limit, offset, filters });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const input = body as ProjectSignalLeadInput;
    const lead = await insertProjectSignalLead(admin, input);
    return NextResponse.json({ lead });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    const status = msg.includes("required") || msg.includes("source") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
