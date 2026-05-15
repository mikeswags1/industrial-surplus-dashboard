import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { deleteLeadRow, updateLeadRow } from "@/lib/repositories/leads.repository";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const admin = requireSupabaseAdmin();

    let patch: Partial<Lead>;
    try {
      patch = (await request.json()) as Partial<Lead>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updated = await updateLeadRow(admin, id, patch);
    if (updated === "empty_patch") {
      return NextResponse.json({ error: "empty patch" }, { status: 400 });
    }
    if (updated === "not_found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ lead: updated });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const admin = requireSupabaseAdmin();
    const outcome = await deleteLeadRow(admin, id);
    if (outcome === "not_found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "internal_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
