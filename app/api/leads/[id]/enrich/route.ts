import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { leadRowToLead, type LeadRow } from "@/lib/db/mappers";
import { enrichFromWebsite } from "@/lib/enrichment/website";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const { data: lead, error } = await admin.from("leads").select("*").eq("id", id).single();
  if (error || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const website = (lead.website as string | null)?.trim();
  if (!website) {
    return NextResponse.json({ error: "Lead has no website to scrape" }, { status: 400 });
  }

  try {
    const en = await enrichFromWebsite(website);
    const { data: updated, error: upErr } = await admin
      .from("leads")
      .update({
        company_summary: en.company_summary,
        industry_detected: en.industry_detected,
        keywords: en.keywords,
        enrichment_at: new Date().toISOString(),
        industry: lead.industry || en.industry_detected,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ lead: leadRowToLead(updated as LeadRow) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Enrichment failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
