import { NextResponse } from "next/server";
import { leadRowToLead, type LeadRow } from "@/lib/db/mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  let patch: Partial<Lead>;
  try {
    patch = (await request.json()) as Partial<Lead>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dbPatch: Record<string, unknown> = {};
  const map: [keyof Lead, string][] = [
    ["company_name", "company_name"],
    ["contact_name", "contact_name"],
    ["email", "email"],
    ["phone", "phone"],
    ["website", "website"],
    ["industry", "industry"],
    ["state", "state"],
    ["city", "city"],
    ["lead_source", "lead_source"],
    ["equipment_type", "equipment_type"],
    ["estimated_value", "estimated_value"],
    ["status", "status"],
    ["notes", "notes"],
    ["tags", "tags"],
    ["company_summary", "company_summary"],
    ["industry_detected", "industry_detected"],
    ["keywords", "keywords"],
  ];
  for (const [k, col] of map) {
    if (k in patch && patch[k] !== undefined) dbPatch[col] = patch[k];
  }

  if (Object.keys(dbPatch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("leads")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ lead: leadRowToLead(data as LeadRow) });
}
