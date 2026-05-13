import { NextResponse } from "next/server";
import {
  campaignInputToInsert,
  campaignRowToCampaign,
  type CampaignRow,
} from "@/lib/db/campaign-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Campaign } from "@/lib/types";

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }
  const { data, error } = await admin
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const campaigns = (data ?? []).map((r) => campaignRowToCampaign(r as CampaignRow));
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = body as Omit<Campaign, "id" | "created_at" | "updated_at">;
  if (!input?.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const row = campaignInputToInsert(input);
  const { data, error } = await admin.from("campaigns").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    campaign: campaignRowToCampaign(data as CampaignRow),
  });
}
