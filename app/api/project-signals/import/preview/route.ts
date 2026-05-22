import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { parseProjectSignalCsv } from "@/lib/project-signals/csv";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    requireSupabaseAdmin();
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    throw e;
  }

  let body: { csvText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.csvText?.trim()) {
    return NextResponse.json({ error: "csvText required" }, { status: 400 });
  }

  const parsed = parseProjectSignalCsv(body.csvText);
  return NextResponse.json({
    rowCount: parsed.rows.length,
    errors: parsed.errors,
    sample: parsed.rows.slice(0, 3),
  });
}
