import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { leadFinderSetup, runLeadFinder } from "@/lib/lead-finder/engine";
import type { LeadFinderSearchInput } from "@/lib/lead-finder/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { LEAD_FINDER_TARGET_INDUSTRY_LABELS, LEAD_FINDER_TARGET_INDUSTRY_LEGACY_ALIASES } from "@/lib/lead-finder/target-industries";
import { EQUIPMENT_TYPES, US_STATES } from "@/lib/types";

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseInput(body: unknown): LeadFinderSearchInput | NextResponse {
  const b = body as Partial<LeadFinderSearchInput> & { industry?: string };
  const state = b.state?.trim().toUpperCase() ?? "";
  const city = b.city?.trim() ?? "";
  const rawTarget =
    (typeof b.target_industry === "string" ? b.target_industry.trim() : "") ||
    (typeof b.industry === "string" ? b.industry.trim() : "");
  const target_industry = rawTarget
    ? LEAD_FINDER_TARGET_INDUSTRY_LEGACY_ALIASES[rawTarget] ?? rawTarget
    : "";
  const equipment_type = b.equipment_type?.trim() ?? "";
  const count = Number(b.count);

  if (!(US_STATES as readonly string[]).includes(state)) return bad("valid state required");
  if (!city) return bad("city required");
  if (!target_industry) return bad("target_industry required (pick a preset category)");
  if (!LEAD_FINDER_TARGET_INDUSTRY_LABELS.has(target_industry)) {
    return bad("target_industry must be one of the Lead Finder preset categories");
  }
  if (!(EQUIPMENT_TYPES as readonly string[]).includes(equipment_type)) {
    return bad("valid equipment_type required");
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return bad("count must be an integer from 1 to 20");
  }

  return { state, city, target_industry, equipment_type, count };
}

export async function POST(request: Request) {
  const setup = leadFinderSetup();
  if (!setup.googlePlacesConfigured) {
    return NextResponse.json(
      {
        error: "Google Places is not configured.",
        code: "GOOGLE_PLACES_NOT_CONFIGURED",
        setup,
        message:
          "Add GOOGLE_PLACES_API_KEY as a server-only environment variable and enable Places API billing.",
      },
      { status: 501 }
    );
  }

  try {
    const admin = requireSupabaseAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return bad("Invalid JSON");
    }

    const input = parseInput(body);
    if (input instanceof NextResponse) return input;

    const result = await runLeadFinder(admin, input);
    return NextResponse.json(result);
  } catch (e) {
    if (isDatabaseNotConfiguredError(e)) return jsonDatabaseNotConfigured(e);
    const msg = e instanceof Error ? e.message : "Lead Finder failed";
    return NextResponse.json({ error: msg, setup }, { status: 500 });
  }
}
