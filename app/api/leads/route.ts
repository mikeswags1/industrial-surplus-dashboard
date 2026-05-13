import { NextResponse } from "next/server";
import {
  leadInputToInsert,
  leadRowToLead,
  type LeadRow,
} from "@/lib/db/mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "not_configured", message: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" },
      { status: 501 }
    );
  }

  const { data, error } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = (data ?? []).map((r) => leadRowToLead(r as LeadRow));
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as Omit<Lead, "id" | "created_at" | "updated_at">;
  if (!input?.company_name?.trim()) {
    return NextResponse.json({ error: "company_name required" }, { status: 400 });
  }

  const row = leadInputToInsert(input);
  const { data, error } = await admin.from("leads").insert(row).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ lead: leadRowToLead(data as LeadRow) });
}
