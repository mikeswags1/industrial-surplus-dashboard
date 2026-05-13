import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BATCH = 200;

/** Enqueue step-0 sends for a list of leads (worker / cron will drain). */
export async function POST(request: Request, ctx: Ctx) {
  const { id: campaignId } = await ctx.params;
  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    throw e;
  }

  let body: { leadIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const leadIds = Array.isArray(body.leadIds) ? body.leadIds.filter(Boolean) : [];
  if (!leadIds.length) {
    return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  }

  const slice = leadIds.slice(0, MAX_BATCH);
  const rows = slice.map((lead_id) => ({
    campaign_id: campaignId,
    lead_id,
    step: 0,
    status: "pending" as const,
  }));

  const { data, error } = await admin
    .from("campaign_send_queue")
    .upsert(rows, { onConflict: "campaign_id,lead_id,step", ignoreDuplicates: true })
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    queued: data?.length ?? 0,
    requested: leadIds.length,
    capped: leadIds.length > MAX_BATCH,
  });
}
