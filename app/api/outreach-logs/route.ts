import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(120, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "25", 10)));

    const { data, error } = await admin
      .from("outreach_logs")
      .select("id, lead_id, event_type, subject, to_email, from_email, created_at, body_preview")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ logs: data ?? [] });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
