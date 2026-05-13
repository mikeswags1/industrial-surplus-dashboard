"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLeads } from "@/context/leads-context";
import type {
  LeadFinderCandidate,
  LeadFinderRunResponse,
} from "@/lib/lead-finder/types";
import {
  EQUIPMENT_TYPES,
  US_STATES,
  type EquipmentType,
  type USState,
} from "@/lib/types";

type RuntimeConfig = {
  dataLayer: "supabase" | "unconfigured";
  googlePlaces: "ok" | "missing";
  openai: "ok" | "missing";
};

function setupCopy(config: RuntimeConfig | null) {
  if (!config) return "Checking setup...";
  const missing = [];
  if (config.dataLayer !== "supabase") missing.push("Supabase server env");
  if (config.googlePlaces !== "ok") missing.push("GOOGLE_PLACES_API_KEY");
  if (missing.length) return `Missing: ${missing.join(", ")}`;
  if (config.openai !== "ok") return "Ready for real search. OpenAI is missing, so scores use a labeled heuristic.";
  return "Ready: Supabase, Google Places, and OpenAI are configured.";
}

function scoreLabel(c: LeadFinderCandidate) {
  if (c.score == null) return "Unscored";
  return `${c.score}/100 ${c.score_source === "ai" ? "AI" : "heuristic"}`;
}

export default function LeadFinderPage() {
  const { refresh: refreshLeads } = useLeads();
  const [state, setState] = useState<USState>("TX");
  const [city, setCity] = useState("Houston");
  const [industry, setIndustry] = useState("Manufacturing");
  const [equipment, setEquipment] = useState<EquipmentType>(EQUIPMENT_TYPES[0]);
  const [count, setCount] = useState(10);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [result, setResult] = useState<LeadFinderRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/config/runtime", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRuntime(j as RuntimeConfig))
      .catch(() => setRuntime(null));
  }, []);

  const candidates = useMemo(
    () => result?.candidates ?? [],
    [result]
  );

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/lead-finder/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          city,
          industry,
          equipment_type: equipment,
          count,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { message?: string; error?: string }).message ??
            (json as { error?: string }).error ??
            "Lead Finder search failed"
        );
      }
      setResult(json as LeadFinderRunResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lead Finder search failed");
    } finally {
      setLoading(false);
    }
  }

  async function approve(candidateId: string) {
    setApproving(candidateId);
    setError(null);
    try {
      const res = await fetch(`/api/lead-finder/candidates/${candidateId}/approve`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Approval failed");
      }
      setResult((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.id === candidateId
                  ? (json as { candidate: LeadFinderCandidate }).candidate
                  : c
              ),
            }
          : prev
      );
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Finder</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Search Google Places for real companies, enrich public website details,
          score fit, then approve selected candidates into the leads dashboard.
          This page never creates fake sample leads.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-zinc-300">Setup status</h2>
            <p className="mt-1 text-zinc-500">{setupCopy(runtime)}</p>
          </div>
          <div className="text-xs text-zinc-600">
            Required: Supabase + <code>GOOGLE_PLACES_API_KEY</code>. Optional:{" "}
            <code>OPENAI_API_KEY</code>.
          </div>
        </div>
      </section>

      <form
        onSubmit={runSearch}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5"
      >
        <div className="grid gap-4 md:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">State</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={state}
              onChange={(e) => setState(e.target.value as USState)}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">City</span>
            <input
              required
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Industry</span>
            <input
              required
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Equipment type</span>
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as EquipmentType)}
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Lead count</span>
            <input
              type="number"
              min={1}
              max={20}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
        >
          {loading ? "Finding real companies..." : "Find leads"}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Preview results</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Approving saves the candidate into Supabase leads with source and
              scoring notes.
            </p>
          </div>
          {result ? (
            <div className="text-xs text-zinc-500">
              Run {result.run.status}: {result.run.result_count} result(s)
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium">Company</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Why selected</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {candidates.map((c) => (
                <tr key={c.id} className="align-top hover:bg-[var(--color-surface-2)]/60">
                  <td className="px-3 py-3 whitespace-nowrap">{scoreLabel(c)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-zinc-100">{c.company_name}</div>
                    <div className="text-xs text-zinc-500">{c.industry || "—"}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{c.phone || "—"}</div>
                    <div className="text-xs text-zinc-500">{c.email || "No public email found"}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      {c.city || city}, {c.state || state}
                    </div>
                    <div className="max-w-[220px] text-xs text-zinc-500">
                      {c.formatted_address || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-[320px] text-zinc-300">
                    {c.score_explanation || "No explanation available."}
                    {c.enrichment_summary ? (
                      <div className="mt-2 text-xs text-zinc-500">
                        Website: {c.enrichment_summary}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      {c.website ? (
                        <a
                          className="block text-xs text-[var(--color-accent)] hover:underline"
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                        </a>
                      ) : null}
                      {c.source_url ? (
                        <a
                          className="block text-xs text-[var(--color-accent)] hover:underline"
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google source
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {c.status === "preview" ? (
                      <button
                        type="button"
                        disabled={approving === c.id}
                        className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
                        onClick={() => void approve(c.id)}
                      >
                        {approving === c.id ? "Saving..." : "Approve"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">{c.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && candidates.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              Run a search to preview real provider results. No sample leads are shown.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
