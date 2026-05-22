import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadFinderCandidateRow, LeadFinderRunRow } from "@/lib/database/types";
import type {
  LeadFinderCandidate,
  LeadFinderSearchInput,
  ScoredCandidate,
} from "@/lib/lead-finder/types";
import { leadRowToLead, type LeadRow } from "@/lib/db/mappers";
import { isLeadFinderStatewideCity } from "@/lib/lead-finder/city-mode";
import { leadFinderCandidateRowToCandidate, leadFinderRunRowToRun } from "@/lib/lead-finder/mappers";
import { isLikelyContactEmail } from "@/lib/lead-finder/email";
import type { Lead } from "@/lib/types";

function summarizeList(parts: string[], maxShown = 3): string {
  const u = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  if (u.length === 0) return "";
  if (u.length <= maxShown) return u.join(", ");
  return `${u.slice(0, maxShown).join(", ")} +${u.length - maxShown}`;
}

function summarizeRunCities(cities: string[], maxShown = 3): string {
  const u = [...new Set(cities.map((p) => p.trim()).filter(Boolean))];
  if (u.length === 1 && isLeadFinderStatewideCity(u[0])) {
    return "All cities in state";
  }
  return summarizeList(u, maxShown);
}

function isMissingColumnError(error: { message?: string } | null | undefined, columns: string[]): boolean {
  const message = error?.message ?? "";
  return (
    message.includes("schema cache") ||
    columns.some((column) => message.includes(column))
  );
}

function normalizeWebsiteKey(website: string | null | undefined): string {
  const raw = website?.trim().toLowerCase() ?? "";
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? raw;
  }
}

function normalizeEmailKey(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeCompanyLocationKey(input: {
  company_name: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
}): string {
  const company = input.company_name?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  const city = input.city?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  const state = input.state?.trim().toUpperCase() ?? "";
  return company && city && state ? `${state}|${city}|${company}` : "";
}

export async function createLeadFinderRun(
  admin: SupabaseClient,
  input: LeadFinderSearchInput,
  placesTextSearchCalls: number
): Promise<LeadFinderRunRow> {
  const row = {
    provider: "google_places",
    status: "running",
    state: summarizeList(input.states),
    city: summarizeRunCities(input.cities),
    industry: summarizeList(input.target_industries),
    equipment_type: input.equipment_type,
    places_text_search_calls: placesTextSearchCalls,
    requested_count: input.count,
  };

  const { data, error } = await admin
    .from("lead_finder_runs")
    .insert(row)
    .select("*")
    .single();
  if (error && isMissingColumnError(error, ["places_text_search_calls"])) {
    const { places_text_search_calls: _unused, ...legacyRow } = row;
    const retry = await admin
      .from("lead_finder_runs")
      .insert(legacyRow)
      .select("*")
      .single();
    if (retry.error) throw new Error(retry.error.message);
    return leadFinderRunRowToRun(retry.data as LeadFinderRunRow);
  }
  if (error) throw new Error(error.message);
  return leadFinderRunRowToRun(data as LeadFinderRunRow);
}

export async function filterExistingLeadFinderCandidates(
  admin: SupabaseClient,
  candidates: ScoredCandidate[]
): Promise<ScoredCandidate[]> {
  if (!candidates.length) return [];

  const { data, error } = await admin
    .from("leads")
    .select("company_name, email, website, city, state")
    .limit(10000);
  if (error) throw new Error(error.message);

  const emails = new Set<string>();
  const websites = new Set<string>();
  const companyLocations = new Set<string>();

  for (const row of data ?? []) {
    const email = normalizeEmailKey(row.email as string | null);
    const website = normalizeWebsiteKey(row.website as string | null);
    const companyLocation = normalizeCompanyLocationKey({
      company_name: row.company_name as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
    });
    if (email) emails.add(email);
    if (website) websites.add(website);
    if (companyLocation) companyLocations.add(companyLocation);
  }

  return candidates.filter((candidate) => {
    const email = normalizeEmailKey(candidate.email);
    if (email && emails.has(email)) return false;

    const website = normalizeWebsiteKey(candidate.website);
    if (website && websites.has(website)) return false;

    const companyLocation = normalizeCompanyLocationKey(candidate);
    if (companyLocation && companyLocations.has(companyLocation)) return false;

    return true;
  });
}

export async function finishLeadFinderRun(
  admin: SupabaseClient,
  id: string,
  patch: { status: "completed" | "failed"; result_count?: number; error?: string | null }
): Promise<LeadFinderRunRow> {
  const { data, error } = await admin
    .from("lead_finder_runs")
    .update({
      status: patch.status,
      result_count: patch.result_count ?? 0,
      error: patch.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return leadFinderRunRowToRun(data as LeadFinderRunRow);
}

export async function insertLeadFinderCandidates(
  admin: SupabaseClient,
  runId: string,
  candidates: ScoredCandidate[]
): Promise<LeadFinderCandidate[]> {
  if (!candidates.length) return [];
  const rows = candidates.map((c) => ({
    run_id: runId,
    provider: c.provider,
    provider_place_id: c.provider_place_id,
    company_name: c.company_name,
    website: c.website || null,
    phone: c.phone || null,
    email: c.email || null,
    city: c.city || null,
    state: c.state || null,
    formatted_address: c.formatted_address || null,
    industry: c.industry || null,
    source_url: c.source_url || null,
    raw_provider: c.raw_provider,
    enrichment_summary: c.enrichment_summary,
    enrichment_source_url: c.enrichment_source_url,
    keywords: c.keywords,
    target_industry: c.target_industry,
    asset_likelihood_score: c.asset_likelihood_score,
    likely_asset_types: c.likely_asset_types,
    outreach_angle: c.outreach_angle,
    reason_selected: c.reason_selected,
    score: c.score,
    score_source: c.score_source,
    score_explanation: c.score_explanation,
    status: "preview",
  }));

  const { data, error } = await admin
    .from("lead_finder_candidates")
    .insert(rows)
    .select("*")
    .order("asset_likelihood_score", { ascending: false, nullsFirst: false })
    .order("score", { ascending: false, nullsFirst: false });
  if (error) {
    if (isMissingColumnError(error, ["target_industry", "asset_likelihood_score", "likely_asset_types", "outreach_angle", "reason_selected"])) {
      const legacyRows = rows.map(
        ({
          target_industry: _targetIndustry,
          asset_likelihood_score: _assetLikelihoodScore,
          likely_asset_types: _likelyAssetTypes,
          outreach_angle: _outreachAngle,
          reason_selected: _reasonSelected,
          ...legacyRow
        }) => legacyRow
      );
      const retry = await admin
        .from("lead_finder_candidates")
        .insert(legacyRows)
        .select("*")
        .order("score", { ascending: false, nullsFirst: false });
      if (retry.error) throw new Error(retry.error.message);
      return ((retry.data ?? []) as LeadFinderCandidateRow[]).map(
        leadFinderCandidateRowToCandidate
      );
    }
    throw new Error(error.message);
  }
  return ((data ?? []) as LeadFinderCandidateRow[]).map(
    leadFinderCandidateRowToCandidate
  );
}

export async function fetchLeadFinderRunWithCandidates(
  admin: SupabaseClient,
  id: string
): Promise<{ run: LeadFinderRunRow; candidates: LeadFinderCandidate[] } | null> {
  const { data: run, error: runErr } = await admin
    .from("lead_finder_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!run) return null;

  const { data: candidates, error: candErr } = await admin
    .from("lead_finder_candidates")
    .select("*")
    .eq("run_id", id)
    .order("asset_likelihood_score", { ascending: false, nullsFirst: false })
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (candErr && isMissingColumnError(candErr, ["asset_likelihood_score"])) {
    const retry = await admin
      .from("lead_finder_candidates")
      .select("*")
      .eq("run_id", id)
      .order("score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (retry.error) throw new Error(retry.error.message);
    return {
      run: leadFinderRunRowToRun(run as LeadFinderRunRow),
      candidates: ((retry.data ?? []) as LeadFinderCandidateRow[]).map(
        leadFinderCandidateRowToCandidate
      ),
    };
  }
  if (candErr) throw new Error(candErr.message);

  return {
    run: leadFinderRunRowToRun(run as LeadFinderRunRow),
    candidates: ((candidates ?? []) as LeadFinderCandidateRow[]).map(
      leadFinderCandidateRowToCandidate
    ),
  };
}

async function findExistingLead(
  admin: SupabaseClient,
  candidate: LeadFinderCandidate
): Promise<string | null> {
  if (candidate.website?.trim()) {
    const { data, error } = await admin
      .from("leads")
      .select("id")
      .eq("website", candidate.website.trim())
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }

  const { data, error } = await admin
    .from("leads")
    .select("id")
    .ilike("company_name", candidate.company_name)
    .eq("city", candidate.city ?? "")
    .eq("state", candidate.state ?? "")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.id as string | undefined) ?? null;
}

export async function approveLeadFinderCandidate(
  admin: SupabaseClient,
  id: string
): Promise<{ lead: Lead | null; candidate: LeadFinderCandidate; duplicate: boolean }> {
  const { data: candidate, error: candErr } = await admin
    .from("lead_finder_candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (candErr) throw new Error(candErr.message);
  if (!candidate) throw new Error("candidate not found");
  const c = candidate as LeadFinderCandidate;
  if (!isLikelyContactEmail(c.email)) {
    throw new Error("EMAIL_REQUIRED_FOR_APPROVAL");
  }
  const { data: run, error: runErr } = await admin
    .from("lead_finder_runs")
    .select("equipment_type")
    .eq("id", c.run_id)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);

  const existingId = await findExistingLead(admin, c);
  if (existingId) {
    const { data: updated, error: upErr } = await admin
      .from("lead_finder_candidates")
      .update({ status: "duplicate", lead_id: existingId })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return {
      lead: null,
      candidate: leadFinderCandidateRowToCandidate(updated as LeadFinderCandidateRow),
      duplicate: true,
    };
  }

  const likelihood = c.asset_likelihood_score ?? c.score;
  const rationale = (c.reason_selected ?? c.score_explanation)?.trim() ?? "";
  const likely =
    Array.isArray(c.likely_asset_types) && c.likely_asset_types.length
      ? c.likely_asset_types.join(", ")
      : null;

  const notes = [
    c.target_industry
      ? `Lead Finder (buy-side) preset category: ${c.target_industry}`
      : null,
    likelihood != null
      ? `Asset likelihood score: ${likelihood}/100 (${c.score_source})${rationale ? `. ${rationale}` : ""}`
      : rationale
        ? `Lead Finder: ${rationale}`
        : null,
    likely ? `Likely asset types: ${likely}` : null,
    c.outreach_angle?.trim()
      ? `Suggested outreach angle: ${c.outreach_angle.trim()}`
      : null,
    c.source_url ? `Source: ${c.source_url}` : null,
    c.enrichment_summary ? `Website summary: ${c.enrichment_summary}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const tags = ["lead-finder", "surplus-holder", "google-places", `run:${c.run_id}`];
  if (c.target_industry) tags.push(`target:${c.target_industry.slice(0, 40)}`);

  const { data: leadRow, error: leadErr } = await admin
    .from("leads")
    .insert({
      company_name: c.company_name,
      contact_name: null,
      email: c.email || null,
      phone: c.phone || null,
      website: c.website || null,
      industry: c.industry || null,
      state: c.state || null,
      city: c.city || null,
      lead_source: "Lead Finder — surplus holders",
      equipment_type: (run?.equipment_type as string | undefined) ?? null,
      estimated_value: null,
      status: "New",
      notes: notes || null,
      tags,
      company_summary: c.enrichment_summary,
      industry_detected: c.industry,
      target_industry: c.target_industry ?? null,
      likely_asset_types: Array.isArray(c.likely_asset_types) ? c.likely_asset_types : [],
    })
    .select("*")
    .single();
  if (leadErr && isMissingColumnError(leadErr, ["target_industry", "likely_asset_types"])) {
    const retry = await admin
      .from("leads")
      .insert({
        company_name: c.company_name,
        contact_name: null,
        email: c.email || null,
        phone: c.phone || null,
        website: c.website || null,
        industry: c.industry || null,
        state: c.state || null,
        city: c.city || null,
        lead_source: "Lead Finder - surplus holders",
        equipment_type: (run?.equipment_type as string | undefined) ?? null,
        estimated_value: null,
        status: "New",
        notes: notes || null,
        tags,
        company_summary: c.enrichment_summary,
        industry_detected: c.industry,
      })
      .select("*")
      .single();
    if (retry.error) throw new Error(retry.error.message);

    const lead = leadRowToLead(retry.data as LeadRow);
    const { data: updated, error: upErr } = await admin
      .from("lead_finder_candidates")
      .update({ status: "approved", lead_id: lead.id })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);

    return {
      lead,
      candidate: leadFinderCandidateRowToCandidate(updated as LeadFinderCandidateRow),
      duplicate: false,
    };
  }
  if (leadErr) throw new Error(leadErr.message);

  const lead = leadRowToLead(leadRow as LeadRow);
  const { data: updated, error: upErr } = await admin
    .from("lead_finder_candidates")
    .update({ status: "approved", lead_id: lead.id })
    .eq("id", id)
    .select("*")
    .single();
  if (upErr) throw new Error(upErr.message);

  const { count } = await admin
    .from("lead_finder_candidates")
    .select("id", { count: "exact", head: true })
    .eq("run_id", c.run_id)
    .eq("status", "approved");
  await admin
    .from("lead_finder_runs")
    .update({ approved_count: count ?? 0 })
    .eq("id", c.run_id);

  return {
    lead,
    candidate: leadFinderCandidateRowToCandidate(updated as LeadFinderCandidateRow),
    duplicate: false,
  };
}

export async function approveAllPreviewCandidates(
  admin: SupabaseClient,
  runId: string
): Promise<{
  approved: number;
  duplicate: number;
  errors: number;
}> {
  const { data: rows, error } = await admin
    .from("lead_finder_candidates")
    .select("id")
    .eq("run_id", runId)
    .eq("status", "preview");
  if (error) throw new Error(error.message);

  let approved = 0;
  let duplicate = 0;
  let errors = 0;

  for (const row of rows ?? []) {
    const candidateId = row.id as string;
    try {
      const result = await approveLeadFinderCandidate(admin, candidateId);
      if (result.duplicate) duplicate++;
      else approved++;
    } catch {
      errors++;
    }
  }

  return { approved, duplicate, errors };
}
