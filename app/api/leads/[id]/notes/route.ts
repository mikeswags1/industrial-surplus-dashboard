import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/default-org";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeadNoteRow } from "@/lib/database/types";

type Ctx = { params: Promise<{ id: string }> };

export type LeadNoteDto = {
  id: string;
  lead_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
};

function rowToDto(row: LeadNoteRow): LeadNoteDto {
  return {
    id: row.id,
    lead_id: row.lead_id,
    body: row.body,
    author_id: row.author_id,
    created_at: row.created_at,
  };
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id: leadId } = await ctx.params;
  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    throw e;
  }

  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await admin
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notes = (data ?? []).map((r) => rowToDto(r as LeadNoteRow));
  return NextResponse.json({ notes });
}

export async function POST(request: Request, ctx: Ctx) {
  const { id: leadId } = await ctx.params;
  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    throw e;
  }

  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = body.body?.trim();
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("lead_notes")
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      lead_id: leadId,
      author_id: null,
      body: text,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: rowToDto(data as LeadNoteRow) });
}
