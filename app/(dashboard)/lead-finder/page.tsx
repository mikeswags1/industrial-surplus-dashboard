"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLeads } from "@/context/leads-context";
import { LEAD_FINDER_MAX_COMBINATIONS } from "@/lib/lead-finder/engine";
import { LEAD_FINDER_TARGET_INDUSTRIES } from "@/lib/lead-finder/target-industries";
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
  if (config.openai !== "ok") return "Ready for real search. OpenAI is missing, so scoring uses labeled heuristics only.";
  return "Ready: Supabase, Google Places, and OpenAI are configured.";
}

function assetScoreLabel(c: LeadFinderCandidate) {
  const n = c.asset_likelihood_score ?? c.score;
  if (n == null) return "Unscored";
  return `${n}/100 ${c.score_source === "ai" ? "AI" : "heuristic"}`;
}

export default function LeadFinderPage() {
  const { refresh: refreshLeads } = useLeads();
  const defaultPreset =
    LEAD_FINDER_TARGET_INDUSTRIES.find((p) => p.label === "Electrical Contractors")?.label ??
    LEAD_FINDER_TARGET_INDUSTRIES[0].label;

  const [selectedStates, setSelectedStates] = useState<USState[]>(["TX"]);
  const [citiesText, setCitiesText] = useState("Houston");
  const [targetIndustries, setTargetIndustries] = useState<string[]>([defaultPreset]);
  const [equipment, setEquipment] = useState<EquipmentType>(EQUIPMENT_TYPES[0]);
  const [count, setCount] = useState(10);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [result, setResult] = useState<LeadFinderRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [addAllBusy, setAddAllBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/config/runtime", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRuntime(j as RuntimeConfig))
      .catch(() => setRuntime(null));
  }, []);

  const candidates = useMemo(() => result?.candidates ?? [], [result]);

  const parsedCities = useMemo(() => {
    const parts = citiesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set(parts)];
  }, [citiesText]);

  const combinationCount = useMemo(
    () => targetIndustries.length * selectedStates.length * parsedCities.length,
    [targetIndustries.length, selectedStates.length, parsedCities.length]
  );

  const combinationOk =
    combinationCount > 0 &&
    combinationCount <= LEAD_FINDER_MAX_COMBINATIONS &&
    targetIndustries.length > 0 &&
    selectedStates.length > 0 &&
    parsedCities.length > 0;

  function toggleTargetIndustry(label: string) {
    setTargetIndustries((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  }

  function toggleStateSel(s: USState) {
    setSelectedStates((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function selectAllIndustries() {
    setTargetIndustries(LEAD_FINDER_TARGET_INDUSTRIES.map((p) => p.label));
  }

  function clearIndustries() {
    setTargetIndustries([]);
  }

  function selectAllStates() {
    setSelectedStates([...US_STATES]);
  }

  function clearStates() {
    setSelectedStates([]);
  }

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
          target_industries: targetIndustries,
          states: selectedStates,
          cities: parsedCities,
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

  async function approveAllPreview() {
    if (!result?.run?.id) return;
    const previewCount = candidates.filter((c) => c.status === "preview").length;
    if (!previewCount) return;
    const ok = confirm(
      `Add all ${previewCount} preview candidate(s) to Leads? Duplicates (same website or company/location) will be skipped automatically.`,
    );
    if (!ok) return;
    setAddAllBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lead-finder/runs/${result.run.id}/approve-all`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Bulk add failed");
      }
      const j = json as { approved?: number; duplicate?: number; errors?: number };
      setError(null);
      const refetch = await fetch(`/api/lead-finder/runs/${result.run.id}`, {
        cache: "no-store",
      });
      const pack = await refetch.json().catch(() => null);
      if (refetch.ok && pack?.run && pack?.candidates) {
        setResult(pack as LeadFinderRunResponse);
      }
      await refreshLeads();
      alert(
        `Added ${j.approved ?? 0} lead(s). Skipped ${j.duplicate ?? 0} duplicate(s). ${j.errors ?? 0} error(s).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setAddAllBusy(false);
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
                c.id === candidateId ? (json as { candidate: LeadFinderCandidate }).candidate : c
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
        <p className="mt-1 max-w-4xl text-sm text-zinc-500">
          Find organizations likely to accumulate industrial assets (potential{" "}
          <span className="text-zinc-400">sellers</span>)—not surplus resellers. Google Places searches use
          preset industry categories across selected cities and states (one Places query per combination, up to{" "}
          {LEAD_FINDER_MAX_COMBINATIONS}). Candidates are scored for{" "}
          <span className="text-zinc-400">likelihood they may hold</span> excess or removable assets; they do{" "}
          <span className="text-zinc-400">not</span> need to advertise surplus publicly. Website enrichment and
          OpenAI review only grounded facts—then approve winners for cold outreach.
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
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-2 text-sm md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-zinc-400">States (multi-select)</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAllStates}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearStates}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800"
                >
                  Clear
                </button>
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] p-2 grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1">
              {US_STATES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-[var(--color-border)]"
                    checked={selectedStates.includes(s)}
                    onChange={() => toggleStateSel(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm md:col-span-1">
            <span className="text-zinc-400">Cities</span>
            <textarea
              required
              rows={5}
              placeholder={'Houston\nDallas\nAustin'}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm min-h-[7rem] resize-y"
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
            />
            <span className="text-[11px] text-zinc-600">
              One city per line or comma-separated. Each is combined with every selected state and category.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="text-zinc-400">Equipment focus</span>
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
            <span className="text-xs text-zinc-600">
              Used for enrichment context and scoring hints—it does{" "}
              <span className="text-zinc-500">not</span> steer Google toward “surplus buyers.”
            </span>
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-4xl">
            <span className="text-sm text-zinc-400">Target industry categories (multi-select)</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={selectAllIndustries}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearIndustries}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800"
              >
                Clear
              </button>
            </span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[9.5rem] overflow-y-auto pr-1 pb-1">
            {LEAD_FINDER_TARGET_INDUSTRIES.map((p) => (
              <button
                key={`chip-${p.label}`}
                type="button"
                onClick={() => toggleTargetIndustry(p.label)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  targetIndustries.includes(p.label)
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-zinc-100"
                    : "border-[var(--color-border)] text-zinc-400 hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 max-w-3xl">
            Each selected category runs a Places query per city/state pair (e.g.{' '}
            <span className="text-zinc-500">
              electrical contractors in {parsedCities[0] ?? "your city"},{" "}
              {selectedStates[0] ?? "ST"}
            </span>
            ). Keep the product of categories × states × cities at or below{" "}
            {LEAD_FINDER_MAX_COMBINATIONS} (currently{" "}
            <span className={combinationOk ? "text-zinc-500" : "text-amber-400"}>
              {combinationCount}
            </span>
            ).
          </p>
          {!combinationOk && combinationCount > LEAD_FINDER_MAX_COMBINATIONS ? (
            <p className="text-xs text-amber-400" role="alert">
              Too many combinations ({combinationCount}). Lower selections so categories × states × cities ≤{" "}
              {LEAD_FINDER_MAX_COMBINATIONS}, or run separate searches.
            </p>
          ) : null}
          {!combinationOk && combinationCount <= LEAD_FINDER_MAX_COMBINATIONS ? (
            <p className="text-xs text-amber-400" role="alert">
              Select at least one category, state, and city.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading || !combinationOk}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
        >
          {loading ? "Finding real companies..." : "Find surplus-holder leads"}
        </button>
        {error ? (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Preview results</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Approve individuals or add every preview row at once. Duplicates are skipped
              automatically — nothing synthetic is inserted.
            </p>
          </div>
          {result ? (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <span className="text-xs text-zinc-500 whitespace-nowrap">
                Run {result.run.status}: {result.run.result_count} result(s)
              </span>
              <button
                type="button"
                disabled={
                  addAllBusy ||
                  candidates.filter((c) => c.status === "preview").length === 0
                }
                onClick={() => void approveAllPreview()}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
              >
                {addAllBusy ? "Adding…" : "Add all"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <table className="min-w-[1400px] w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">Likelihood</th>
                <th className="px-3 py-3 font-medium">Company</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Website</th>
                <th className="px-3 py-3 font-medium">Target industry</th>
                <th className="px-3 py-3 font-medium">Likely assets</th>
                <th className="px-3 py-3 font-medium max-w-[220px]">Why selected</th>
                <th className="px-3 py-3 font-medium max-w-[200px]">Outreach angle</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {candidates.map((c) => (
                <tr key={c.id} className="align-top hover:bg-[var(--color-surface-2)]/60">
                  <td className="px-3 py-3 whitespace-nowrap">{assetScoreLabel(c)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-zinc-100">{c.company_name}</div>
                    <div className="text-xs text-zinc-500">{c.industry || "—"}</div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {(c.email || "").trim() ? c.email : "No public email from crawl"}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {c.city || "—"}, {c.state || "—"}
                  </td>
                  <td className="px-3 py-3">{c.phone || "—"}</td>
                  <td className="px-3 py-3">
                    {c.website?.trim() ? (
                      <a
                        className="text-[var(--color-accent)] hover:underline break-all"
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {c.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-zinc-300 max-w-[10rem]">
                    {c.target_industry ?? result?.run.industry ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-zinc-400 max-w-[12rem] text-xs leading-relaxed">
                    {(c.likely_asset_types ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-zinc-400 text-xs leading-relaxed max-w-[220px]">
                    {c.reason_selected || c.score_explanation || "—"}
                    {c.enrichment_summary ? (
                      <div className="mt-2 text-[11px] text-zinc-600 border-t border-[var(--color-border)]/60 pt-2">
                        Site: {c.enrichment_summary}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-400 text-xs leading-relaxed max-w-[200px]">
                    {c.outreach_angle ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      {c.source_url ? (
                        <a
                          className="block text-xs text-[var(--color-accent)] hover:underline"
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google source
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
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
              Run a search to preview surplus-holder prospects. No sample rows are synthesized.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
