import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { leadInputToInsert } from "@/lib/db/mappers";
import {
  csvRowToLeadInput,
  normalizeDedupeKey,
  parseLeadCsv,
} from "@/lib/leads/csv";
import { queryExistingDedupeKeys } from "@/lib/repositories/leads.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    throw e;
  }

  let body: { csvText?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.csvText?.trim()) {
    return NextResponse.json({ error: "csvText required" }, { status: 400 });
  }

  const tag = (body.tag ?? `import-${new Date().toISOString().slice(0, 10)}`).replace(
    /[^\w\-./]/g,
    ""
  );

  const parsed = parseLeadCsv(body.csvText);
  if (parsed.errors.length) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  if (parsed.rows.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 data rows per import. Split the file." },
      { status: 400 }
    );
  }

  const seen = await queryExistingDedupeKeys(admin);

  let inserted = 0;
  let skipped = 0;
  const rowErrors: { line: number; message: string }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const line = i + 2;
    const conv = csvRowToLeadInput(parsed.rows[i], tag);
    if (!conv.ok) {
      rowErrors.push({ line, message: conv.message });
      continue;
    }
    const key = normalizeDedupeKey(conv.value.email, conv.value.company_name);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);

    const row = leadInputToInsert(conv.value);
    const { error } = await admin.from("leads").insert(row);
    if (error) {
      rowErrors.push({ line, message: error.message });
      continue;
    }
    inserted++;
  }

  return NextResponse.json({
    inserted,
    skipped,
    rowErrors,
    totalLines: parsed.rows.length,
  });
}
