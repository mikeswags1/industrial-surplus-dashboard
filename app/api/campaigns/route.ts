import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import {
  fetchCampaigns,
  insertCampaignRow,
} from "@/lib/repositories/campaigns.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { Campaign } from "@/lib/types";

export async function GET() {
  try {
    const admin = requireSupabaseAdmin();
    const campaigns = await fetchCampaigns(admin);
    return NextResponse.json({ campaigns });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
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

    const campaign = await insertCampaignRow(admin, input);
    return NextResponse.json({ campaign });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
