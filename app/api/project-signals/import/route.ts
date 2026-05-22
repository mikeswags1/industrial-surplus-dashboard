import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { csvRowToProjectSignalInput, parseProjectSignalCsv } from "@/lib/project-signals/csv";
import { insertProjectSignalLead } from "@/lib/repositories/project-signals.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let admin;
  try {
    admin = requireSupabaseAdmin();
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
  if (parsed.errors.length) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  if (parsed.rows.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 data rows per import. Split the file." },
      { status: 400 }
    );
  }

  let inserted = 0;
  const rowErrors: { line: number; message: string }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const line = i + 2;
    const conv = csvRowToProjectSignalInput(parsed.rows[i]);
    if (!conv.ok) {
      rowErrors.push({ line, message: conv.message });
      continue;
    }
    try {
      await insertProjectSignalLead(admin, {
        ...conv.value,
        source_type: conv.value.is_demo ? "demo" : "csv_import",
      });
      inserted++;
    } catch (e) {
      rowErrors.push({
        line,
        message: e instanceof Error ? e.message : "Insert failed",
      });
    }
  }

  return NextResponse.json({
    inserted,
    rowErrors,
    totalLines: parsed.rows.length,
  });
}
