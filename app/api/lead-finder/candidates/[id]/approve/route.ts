import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { approveLeadFinderCandidate } from "@/lib/repositories/lead-finder.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const admin = requireSupabaseAdmin();
    const result = await approveLeadFinderCandidate(admin, id);
    return NextResponse.json(result);
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "approval failed";
    const friendly =
      msg === "EMAIL_REQUIRED_FOR_APPROVAL"
        ? "Lead Finder requires a contact email found on the company website before approving."
        : msg;
    const status =
      msg === "candidate not found"
        ? 404
        : msg === "EMAIL_REQUIRED_FOR_APPROVAL"
          ? 400
          : 500;
    return NextResponse.json({ error: friendly }, { status });
  }
}
