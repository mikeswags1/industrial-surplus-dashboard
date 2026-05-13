import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { buildLeadImportPreview } from "@/lib/leads/import-preview";
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

  const tag = (body.tag ?? `preview-${new Date().toISOString().slice(0, 10)}`).replace(
    /[^\w\-./]/g,
    ""
  );

  const parsed = await buildLeadImportPreview(admin, body.csvText, tag);
  if (parsed.parseErrors.length) {
    return NextResponse.json({ errors: parsed.parseErrors }, { status: 400 });
  }

  if (parsed.summary.totalDataRows > 500) {
    return NextResponse.json(
      { error: "Maximum 500 data rows per preview/import. Split the file." },
      { status: 400 }
    );
  }

  return NextResponse.json(parsed);
}
