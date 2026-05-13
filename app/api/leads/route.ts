import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import {
  clampLeadListParams,
  fetchLeads,
  insertLeadRow,
} from "@/lib/repositories/leads.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const { limit, offset } = clampLeadListParams(
      searchParams.get("limit"),
      searchParams.get("offset")
    );
    const leads = await fetchLeads(admin, limit, offset);
    return NextResponse.json({ leads, limit, offset });
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

    const input = body as Omit<Lead, "id" | "created_at" | "updated_at">;
    if (!input?.company_name?.trim()) {
      return NextResponse.json({ error: "company_name required" }, { status: 400 });
    }

    const lead = await insertLeadRow(admin, input);
    return NextResponse.json({ lead });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
