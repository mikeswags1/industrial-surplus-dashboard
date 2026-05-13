import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeadFinderCandidateRow,
  LeadFinderRunRow,
} from "@/lib/database/types";
import { leadRowToLead, type LeadRow } from "@/lib/db/mappers";
import type {
  LeadFinderCandidate,
  LeadFinderSearchInput,
  ScoredCandidate,
} from "@/lib/lead-finder/types";
import {
  leadFinderCandidateRowToCandidate,
  leadFinderRunRowToRun,
} from "@/lib/lead-finder/mappers";
import type { Lead } from "@/lib/types";

export async function createLeadFinderRun(
  admin: SupabaseClient,
  input: LeadFinderSearchInput
): Promise<LeadFinderRunRow> {
  const { data, error } = await admin
    .from("lead_finder_runs")
    .insert({
      provider: "google_places",
      status: "running",
      state: input.state,
      city: input.city,
      industry: input.industry,
      equipment_type: input.equipment_type,
      requested_count: input.count,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return leadFinderRunRowToRun(data as LeadFinderRunRow);
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
    score: c.score,
    score_source: c.score_source,
    score_explanation: c.score_explanation,
    status: "preview",
  }));

  const { data, error } = await admin
    .from("lead_finder_candidates")
    .insert(rows)
    .select("*")
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
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
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });
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

  const notes = [
    c.score_explanation ? `Lead Finder score: ${c.score ?? "unscored"} (${c.score_source}). ${c.score_explanation}` : null,
    c.source_url ? `Source: ${c.source_url}` : null,
    c.enrichment_summary ? `Website summary: ${c.enrichment_summary}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

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
      lead_source: "Google Places",
      equipment_type: (run?.equipment_type as string | undefined) ?? null,
      estimated_value: null,
      status: "New",
      notes: notes || null,
      tags: ["lead-finder", "google-places", `run:${c.run_id}`],
      company_summary: c.enrichment_summary,
      industry_detected: c.industry,
      keywords: c.keywords ?? [],
    })
    .select("*")
    .single();
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
