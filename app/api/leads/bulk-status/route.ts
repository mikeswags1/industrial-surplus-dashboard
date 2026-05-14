import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { updateLeadsStatusBulk } from "@/lib/repositories/leads.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

type Body = { ids?: unknown; status?: unknown };

export async function POST(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    const status = body.status;
    if (!ids.length) return NextResponse.json({ error: "ids array required" }, { status: 400 });
    if (typeof status !== "string" || !(LEAD_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: "valid status required" }, { status: 400 });
    }
    const updated = await updateLeadsStatusBulk(admin, ids, status as LeadStatus);
    return NextResponse.json({ updated });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "bulk update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
