import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { approveAllPreviewCandidates } from "@/lib/repositories/lead-finder.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const admin = requireSupabaseAdmin();
    const result = await approveAllPreviewCandidates(admin, id);
    return NextResponse.json(result);
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "bulk approve failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
