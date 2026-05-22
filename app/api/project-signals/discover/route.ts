import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { runProjectSignalDiscovery } from "@/lib/project-signals/discovery/run";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { US_STATES } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const admin = requireSupabaseAdmin();
    let body: { state?: string } = {};
    try {
      body = (await request.json()) as { state?: string };
    } catch {
      body = {};
    }

    const state = body.state?.trim().toUpperCase();
    if (state && !US_STATES.includes(state as (typeof US_STATES)[number])) {
      return NextResponse.json({ error: "Invalid state code" }, { status: 400 });
    }

    const result = await runProjectSignalDiscovery(admin, {
      stateFilter: state || undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "discovery failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
