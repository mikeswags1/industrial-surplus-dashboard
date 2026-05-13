import { NextResponse } from "next/server";
import { campaignRowToCampaign, type CampaignRow } from "@/lib/db/campaign-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Campaign } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  let patch: Partial<Campaign>;
  try {
    patch = (await request.json()) as Partial<Campaign>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dbPatch: Record<string, unknown> = {};
  const keys: (keyof Campaign)[] = [
    "name",
    "equipment_type",
    "region",
    "primary_subject",
    "primary_body",
    "follow_up_1",
    "follow_up_2",
    "status",
    "emails_sent",
    "replies_count",
    "interested_count",
  ];
  for (const k of keys) {
    if (k in patch && patch[k] !== undefined) dbPatch[k as string] = patch[k];
  }
  if (Object.keys(dbPatch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("campaigns")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    campaign: campaignRowToCampaign(data as CampaignRow),
  });
}
