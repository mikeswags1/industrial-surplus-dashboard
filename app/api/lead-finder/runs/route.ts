import { NextResponse } from "next/server";
import {
  isDatabaseNotConfiguredError,
  jsonDatabaseNotConfigured,
} from "@/lib/api/database-error";
import { LEAD_FINDER_MAX_COMBINATIONS, leadFinderSetup, runLeadFinder } from "@/lib/lead-finder/engine";
import type { LeadFinderSearchInput } from "@/lib/lead-finder/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  LEAD_FINDER_TARGET_INDUSTRY_LABELS,
  LEAD_FINDER_TARGET_INDUSTRY_LEGACY_ALIASES,
} from "@/lib/lead-finder/target-industries";
import { EQUIPMENT_TYPES, US_STATES } from "@/lib/types";

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeIndustryLabel(raw: string): string {
  const t = raw.trim();
  return LEAD_FINDER_TARGET_INDUSTRY_LEGACY_ALIASES[t] ?? t;
}

function parseStringList(
  value: unknown,
  opts: { upperCase?: boolean; allowLegacySingle?: boolean }
): string[] | null {
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const v of value) {
      if (typeof v !== "string") return null;
      const s = opts.upperCase ? v.trim().toUpperCase() : v.trim();
      if (s) out.push(s);
    }
    return out.length ? out : null;
  }
  if (opts.allowLegacySingle && typeof value === "string" && value.trim()) {
    const s = opts.upperCase ? value.trim().toUpperCase() : value.trim();
    return [s];
  }
  return null;
}

function parseCitiesText(body: Partial<LeadFinderSearchInput> & { city?: string; cities_text?: string }) {
  const arr = parseStringList(body.cities, { upperCase: false });
  if (arr?.length) return [...new Set(arr)];
  if (typeof body.cities_text === "string" && body.cities_text.trim()) {
    const parts = body.cities_text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set(parts)];
  }
  if (typeof body.city === "string" && body.city.trim()) {
    return [body.city.trim()];
  }
  return null;
}

function parseInput(body: unknown): LeadFinderSearchInput | NextResponse {
  const b = body as Partial<LeadFinderSearchInput> & {
    industry?: string;
    target_industry?: string;
    state?: string;
    city?: string;
    cities_text?: string;
  };

  const states =
    parseStringList(b.states, { upperCase: true, allowLegacySingle: true }) ??
    (b.state?.trim() ? [b.state.trim().toUpperCase()] : null);

  const cities = parseCitiesText(b);
  const rawIndustries =
    parseStringList(b.target_industries, { upperCase: false, allowLegacySingle: false }) ??
    (typeof b.target_industry === "string" && b.target_industry.trim()
      ? [b.target_industry]
      : typeof b.industry === "string" && b.industry.trim()
        ? [b.industry]
        : null);

  const equipment_type = b.equipment_type?.trim() ?? "";
  const count = Number(b.count);

  if (!states?.length) return bad("At least one valid state is required (states[] or state)");
  for (const st of states) {
    if (!(US_STATES as readonly string[]).includes(st)) return bad(`Invalid state: ${st}`);
  }

  if (!cities?.length) return bad("At least one city is required (cities[], cities_text, or city)");

  if (!rawIndustries?.length) {
    return bad("At least one target_industries entry is required (or target_industry / industry)");
  }

  const target_industries: string[] = [];
  for (const raw of rawIndustries) {
    const label = normalizeIndustryLabel(raw);
    if (!LEAD_FINDER_TARGET_INDUSTRY_LABELS.has(label)) {
      return bad("Each target industry must be one of the Lead Finder preset categories");
    }
    if (!target_industries.includes(label)) target_industries.push(label);
  }

  if (!(EQUIPMENT_TYPES as readonly string[]).includes(equipment_type)) {
    return bad("valid equipment_type required");
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return bad("count must be an integer from 1 to 20");
  }

  const combos = target_industries.length * states.length * cities.length;
  if (combos > LEAD_FINDER_MAX_COMBINATIONS) {
    return bad(
      `Too many combinations (${combos}). Reduce categories, states, or cities so the product is at most ${LEAD_FINDER_MAX_COMBINATIONS}, or run separate searches.`
    );
  }

  return {
    states: [...new Set(states)],
    cities: [...new Set(cities)],
    target_industries,
    equipment_type,
    count,
  };
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
