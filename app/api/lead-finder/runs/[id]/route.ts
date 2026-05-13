import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { leadFinderSetup } from "@/lib/lead-finder/engine";
import { fetchLeadFinderRunWithCandidates } from "@/lib/repositories/lead-finder.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const admin = requireSupabaseAdmin();
    const result = await fetchLeadFinderRunWithCandidates(admin, id);
    if (!result) {
      return NextResponse.json({ error: "run not found" }, { status: 404 });
    }
    return NextResponse.json({ ...result, setup: leadFinderSetup() });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "Lead Finder failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
