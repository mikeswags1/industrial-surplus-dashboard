import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { insertManualReplyLog, updateLeadRow } from "@/lib/repositories/leads.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type Body = { ids?: unknown };

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
    if (!ids.length) return NextResponse.json({ error: "ids array required" }, { status: 400 });

    let updated = 0;
    for (const id of ids) {
      await insertManualReplyLog(admin, id);
      const r = await updateLeadRow(admin, id, { status: "Replied" });
      if (r !== "not_found") updated++;
    }
    return NextResponse.json({ updated });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "bulk replied failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
