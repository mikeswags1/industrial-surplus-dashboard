import { NextResponse } from "next/server";
import { leadRowToLead, leadInputToInsert, type LeadRow } from "@/lib/db/mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  csvRowToLeadInput,
  normalizeDedupeKey,
  parseLeadCsv,
} from "@/lib/leads/csv";

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 501 });

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

  const { data: existing } = await admin
    .from("leads")
    .select("email, company_name")
    .limit(5000);

  const seen = new Set<string>();
  for (const r of existing ?? []) {
    const e = (r.email as string | null)?.trim();
    const c = (r.company_name as string)?.trim();
    if (e && c) seen.add(normalizeDedupeKey(e, c));
  }

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
