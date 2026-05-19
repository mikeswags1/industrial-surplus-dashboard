"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { useLeads } from "@/context/leads-context";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import type { LeadFinderCityMode } from "@/lib/lead-finder/city-mode";
import {
  LEAD_FINDER_MAX_COMBINATIONS,
  maxSelectableIndustries,
  maxSelectableStates,
} from "@/lib/lead-finder/engine";
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
  if (config.openai !== "ok") return "Search works. Add OpenAI later for smarter scoring (heuristics run now).";
  return "Fully configured: Google Places + OpenAI.";
}

function StepFrame({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-0)]/80 p-4 sm:p-5 space-y-4">
      <div className="flex gap-3 sm:gap-4 items-start">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-base font-bold text-white shadow-[0_4px_16px_-4px_rgba(242,92,5,0.5)]"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--color-heading)] tracking-tight">{title}</h3>
          {hint ? <p className="mt-1 text-sm text-[var(--color-body-muted)] font-medium">{hint}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function assetScoreLabel(c: LeadFinderCandidate) {
  const n = c.asset_likelihood_score ?? c.score;
  if (n == null) return "Unscored";
  return `${n}/100 ${c.score_source === "ai" ? "AI" : "heuristic"}`;
}

/** True if this industry can stay checked / be checked without exceeding Places combinations. */
function canToggleIndustry(
  label: string,
  industries: string[],
  stateCount: number,
  citySlots: number
): boolean {
  const on = industries.includes(label);
  if (on) return true;
  const nextI = industries.length + 1;
  if (citySlots > 0) {
    const sc = Math.max(1, stateCount);
    const cs = Math.max(1, citySlots);
    return nextI * sc * cs <= LEAD_FINDER_MAX_COMBINATIONS;
  }
  return industries.length < LEAD_FINDER_MAX_COMBINATIONS;
}

/** True if this state can stay checked / be checked without exceeding Places combinations. */
function canToggleState(
  code: USState,
  states: USState[],
  industryCount: number,
  citySlots: number
): boolean {
  const on = states.includes(code);
  if (on) return true;
  const nextS = states.length + 1;
  if (citySlots > 0) {
    const ic = Math.max(1, industryCount);
    const cs = Math.max(1, citySlots);
    return ic * nextS * cs <= LEAD_FINDER_MAX_COMBINATIONS;
  }
  return states.length < LEAD_FINDER_MAX_COMBINATIONS;
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
  const [cityMode, setCityMode] = useState<LeadFinderCityMode>("specific");
  const [stateFilter, setStateFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  useEffect(() => {
    void dashboardFetch("/api/config/runtime", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRuntime(j as RuntimeConfig))
      .catch(() => setRuntime(null));
  }, []);

  const candidates = useMemo(() => result?.candidates ?? [], [result]);

  const parsedCities = useMemo(() => {
    const parts = citiesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !s.includes("__LF_STATEWIDE__"));
    return [...new Set(parts)];
  }, [citiesText]);

  const citySlots = cityMode === "statewide" ? 1 : parsedCities.length;

  const combinationCount = useMemo(
    () => targetIndustries.length * selectedStates.length * citySlots,
    [targetIndustries.length, selectedStates.length, citySlots]
  );

  const combinationOk =
    combinationCount > 0 &&
    combinationCount <= LEAD_FINDER_MAX_COMBINATIONS &&
    targetIndustries.length > 0 &&
    selectedStates.length > 0 &&
    citySlots > 0;

  const filteredStates = useMemo(() => {
    const q = stateFilter.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateFilter]);

  const filteredIndustries = useMemo(() => {
    const q = industryFilter.trim().toLowerCase();
    if (!q) return LEAD_FINDER_TARGET_INDUSTRIES;
    return LEAD_FINDER_TARGET_INDUSTRIES.filter((p) => p.label.toLowerCase().includes(q));
  }, [industryFilter]);

  const setupReady =
    runtime?.dataLayer === "supabase" && runtime?.googlePlaces === "ok";

  const geographyReady = selectedStates.length > 0 && citySlots > 0;
  const maxIndustryChoices = geographyReady
    ? maxSelectableIndustries(selectedStates.length, citySlots)
    : null;
  const maxStateChoices = geographyReady
    ? maxSelectableStates(targetIndustries.length, citySlots)
    : null;

  function toggleTargetIndustry(label: string) {
    setTargetIndustries((prev) => {
      if (prev.includes(label)) return prev.filter((x) => x !== label);
      if (!canToggleIndustry(label, prev, selectedStates.length, citySlots)) return prev;
      return [...prev, label];
    });
  }

  function toggleStateSel(s: USState) {
    setSelectedStates((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (!canToggleState(s, prev, targetIndustries.length, citySlots)) return prev;
      return [...prev, s];
    });
  }

  function clearIndustries() {
    setTargetIndustries([]);
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
      const res = await dashboardFetch("/api/lead-finder/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_industries: targetIndustries,
          states: selectedStates,
          ...(cityMode === "statewide"
            ? { city_mode: "statewide" }
            : { city_mode: "specific", cities: parsedCities }),
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
      const res = await dashboardFetch(`/api/lead-finder/runs/${result.run.id}/approve-all`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Bulk add failed");
      }
      const j = json as { approved?: number; duplicate?: number; errors?: number };
      setError(null);
      const refetch = await dashboardFetch(`/api/lead-finder/runs/${result.run.id}`, {
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
      const res = await dashboardFetch(`/api/lead-finder/candidates/${candidateId}/approve`, {
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
    <div className="space-y-8 w-full max-w-4xl xl:max-w-none">
      <PageHeader
        title="Find leads"
        description={
          <div className="space-y-3">
            <p>
              Jake — Lead Finder pulls businesses from{" "}
              <strong className="font-semibold text-[var(--color-body)]">Google Places</strong> using your presets
              (industry/category), geography, and an equipment lens, then ranks them by how likely they are to hold
              removable industrial surplus. Rows are Cold-email ready:{" "}
              <strong className="font-semibold text-[var(--color-body)]">we only save companies whose website yields a usable contact email</strong>{" "}
              we scrape ourselves (Places does not expose email).
            </p>
            <ul className="list-disc pl-[1.125rem] space-y-2 marker:text-[var(--color-accent)]">
              <li>
                <strong className="font-semibold text-[var(--color-heading)]">Search ceiling — {LEAD_FINDER_MAX_COMBINATIONS} per run:</strong> each{" "}
                <em>category × state × city slot</em> is one Google search. Whole-state mode counts as{" "}
                <strong className="font-semibold text-[var(--color-body)]">one slot per state</strong>; listing cities counts{" "}
                <strong className="font-semibold text-[var(--color-body)]">one slot per city name</strong>. Totals cannot exceed{" "}
                {LEAD_FINDER_MAX_COMBINATIONS}; checkboxes gray out instead of stacking past it. Spread larger coverage across separate searches.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-heading)]">
                  Rows per search (step 3) is &ldquo;top N after filtering&rdquo;:
                </strong>{" "}
                we score a pool internally, drop anyone without a qualifying email, then keep up to your number (you may see fewer rows if fewer sites expose email).
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-heading)]">Results → Leads:</strong> use{" "}
                <strong className="font-semibold text-[var(--color-body)]">Approve</strong> row-by-row or{" "}
                <strong className="font-semibold text-[var(--color-body)]">Add all</strong> for previews; duplicates (same website or same company near the same spot) skip automatically when added.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-heading)]">Geography:</strong> state + city must match reality (e.g. Houston with{" "}
                <strong className="font-semibold text-[var(--color-body)]">TX</strong> vs small towns named Houston elsewhere), or irrelevant listings slip in through Maps.
              </li>
              <li>
                <strong className="font-semibold text-[var(--color-heading)]">Setup banner below:</strong> needs Supabase + Places key; optional OpenAI key improves explanations — heuristics run without it. Check there if searches fail silently.
              </li>
            </ul>
          </div>
        }
      />

      <details className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${setupReady ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400"}`}
              aria-hidden
            />
            <span className="font-bold text-[var(--color-heading)] text-sm sm:text-base truncate">
              {setupReady ? "Search is ready" : "Check setup (expand)"}
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--color-muted)] shrink-0 group-open:hidden">Show details</span>
          <span className="text-xs font-semibold text-[var(--color-muted)] shrink-0 hidden group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-[var(--color-border-subtle)] px-4 pb-4 pt-2 sm:px-5 text-sm text-[var(--color-body-muted)] space-y-2">
          <p>{setupCopy(runtime)}</p>
          <p className="text-xs text-[var(--color-muted)]">
            Needs Supabase + <code className="text-[var(--color-body)]">GOOGLE_PLACES_API_KEY</code>.{" "}
            <code className="text-[var(--color-body)]">OPENAI_API_KEY</code> is optional (smarter scores).
          </p>
        </div>
      </details>

      <form
        onSubmit={runSearch}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-4 sm:p-6 space-y-6"
      >
        <StepFrame
          step={1}
          title="Where should we look?"
          hint="Pick states, then choose all cities in those states or only cities you list by name."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                cityMode === "statewide"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/12 ring-2 ring-[var(--color-accent)]/35"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-subtle)]"
              }`}
            >
              <input
                type="radio"
                name="city-scope"
                className="sr-only"
                checked={cityMode === "statewide"}
                onChange={() => setCityMode("statewide")}
              />
              <div className="font-bold text-[var(--color-heading)]">All cities in each state</div>
              <p className="mt-2 text-sm text-[var(--color-body-muted)] font-medium leading-relaxed">
                Whole-state search: every metro and town in each checked state is in scope — no city list. One search
                per industry per state.
              </p>
            </label>
            <label
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                cityMode === "specific"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/12 ring-2 ring-[var(--color-accent)]/35"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-subtle)]"
              }`}
            >
              <input
                type="radio"
                name="city-scope"
                className="sr-only"
                checked={cityMode === "specific"}
                onChange={() => setCityMode("specific")}
              />
              <div className="font-bold text-[var(--color-heading)]">Only certain cities</div>
              <p className="mt-2 text-sm text-[var(--color-body-muted)] font-medium leading-relaxed">
                Limit to metros you list — we combine each name with the states and categories you selected.
              </p>
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">
                  States · {selectedStates.length} selected
                </span>
                <button type="button" onClick={clearStates} className="dash-btn-secondary py-1 px-2 text-xs min-h-0">
                  Clear
                </button>
              </div>
              {maxStateChoices != null ? (
                <p className="text-xs text-[var(--color-body-muted)] font-medium leading-relaxed">
                  You can enable up to {maxStateChoices} states with your current categories and geography (max{" "}
                  {LEAD_FINDER_MAX_COMBINATIONS} Google searches per run). Grayed boxes are over the limit.
                </p>
              ) : (
                <p className="text-xs text-[var(--color-body-muted)] font-medium leading-relaxed">
                  Add cities or switch to whole-state mode, and keep at least one category selected, to see exactly how many
                  states fit the {LEAD_FINDER_MAX_COMBINATIONS}-search cap.
                </p>
              )}
              <input
                type="search"
                placeholder="Filter states (e.g. TX, FL)"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="dash-input py-2"
                aria-label="Filter state list"
              />
              <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-0)] p-2 space-y-0.5">
                {filteredStates.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)] px-2 py-3">No matches.</p>
                ) : (
                  filteredStates.map((s) => {
                    const on = selectedStates.includes(s);
                    const allowAdd = canToggleState(s, selectedStates, targetIndustries.length, citySlots);
                    const disabled = !on && !allowAdd;
                    return (
                      <label
                        key={s}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium ${
                          disabled
                            ? "cursor-not-allowed text-[var(--color-muted)] opacity-65"
                            : "text-[var(--color-body)] hover:bg-[var(--color-surface-2)] cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-[var(--color-border)] h-4 w-4 shrink-0 disabled:opacity-45"
                          checked={on}
                          disabled={disabled}
                          onChange={() => toggleStateSel(s)}
                        />
                        {s}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            {cityMode === "specific" ? (
              <label className="flex flex-col gap-2">
                <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">
                  City names
                </span>
                <textarea
                  required={cityMode === "specific"}
                  rows={8}
                  placeholder={"Houston\nDallas"}
                  className="dash-input min-h-[11rem] resize-y font-medium"
                  value={citiesText}
                  onChange={(e) => setCitiesText(e.target.value)}
                />
                <span className="text-xs text-[var(--color-muted)] font-medium">
                  One city per line, or commas between names.
                </span>
              </label>
            ) : (
              <div className="flex flex-col justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)]/60 p-6 text-center">
                <p className="text-sm font-bold text-[var(--color-heading)]">No cities to type</p>
                <p className="mt-2 text-sm text-[var(--color-body-muted)] font-medium leading-relaxed">
                  We&apos;ll run a broader search labeled with the full state name (for example Texas, Florida).
                </p>
              </div>
            )}
          </div>
        </StepFrame>

        <StepFrame
          step={2}
          title="Which industries?"
          hint={`Check the kinds of businesses you want. Each category × state × (city or whole-state slot) is one Google search — we cap at ${LEAD_FINDER_MAX_COMBINATIONS} per run. Only combinations within the limit can be checked; the rest stay disabled.`}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-[var(--color-heading)]">{targetIndustries.length} selected</span>
              <button type="button" onClick={clearIndustries} className="dash-btn-secondary py-1 px-2 text-xs min-h-0">
                Clear
              </button>
            </div>
            {maxIndustryChoices != null ? (
              <p className="text-xs text-[var(--color-body-muted)] font-medium leading-relaxed">
                You can enable up to {maxIndustryChoices} categories with your current states and geography (max{" "}
                {LEAD_FINDER_MAX_COMBINATIONS} Google searches per run). Grayed rows are over the limit.
              </p>
            ) : (
              <p className="text-xs text-[var(--color-body-muted)] font-medium leading-relaxed">
                Add states and cities (or whole-state mode) to see exactly how many categories fit the{" "}
                {LEAD_FINDER_MAX_COMBINATIONS}-search cap.
              </p>
            )}
            <input
              type="search"
              placeholder="Search categories…"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="dash-input py-2"
              aria-label="Filter industries"
            />
            <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-0)] p-2 space-y-0.5">
              {filteredIndustries.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)] px-2 py-3">No matches — clear the search.</p>
              ) : (
                filteredIndustries.map((p) => {
                  const on = targetIndustries.includes(p.label);
                  const allowAdd = canToggleIndustry(
                    p.label,
                    targetIndustries,
                    selectedStates.length,
                    citySlots
                  );
                  const disabled = !on && !allowAdd;
                  return (
                    <label
                      key={`ind-${p.label}`}
                      className={`flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors ${
                        disabled
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer " +
                            (on
                              ? "bg-[var(--color-accent)]/14 ring-1 ring-[var(--color-accent)]/40"
                              : "hover:bg-[var(--color-surface-2)]")
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-[var(--color-border)] h-4 w-4 shrink-0 mt-0.5 disabled:opacity-45"
                        checked={on}
                        disabled={disabled}
                        onChange={() => toggleTargetIndustry(p.label)}
                      />
                      <span
                        className={`text-sm font-medium leading-snug ${on ? "text-[var(--color-heading)]" : "text-[var(--color-body-muted)]"}`}
                      >
                        {p.label}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </StepFrame>

        <StepFrame
          step={3}
          title="Search size & equipment"
          hint="How many results per combo, and what equipment we emphasize when scoring."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">Equipment lens</span>
              <select
                className="dash-input py-2.5"
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
            <label className="flex flex-col gap-2">
              <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">Rows per search</span>
              <input
                type="number"
                min={1}
                max={20}
                className="dash-input py-2.5 font-mono tabular-nums"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
          </div>
        </StepFrame>

        <div
          className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm font-semibold ${
            combinationOk
              ? "border-emerald-500/25 bg-emerald-500/[0.07] text-[var(--color-body)]"
              : "border-amber-500/30 bg-amber-500/[0.08] text-amber-200/95"
          }`}
        >
          <span>
            {combinationCount} Google search run{combinationCount === 1 ? "" : "s"}{" "}
            <span className="font-normal opacity-85">
              ({targetIndustries.length} industries × {selectedStates.length}{" "}
            {selectedStates.length === 1 ? "state" : "states"} ×{" "}
            {cityMode === "statewide"
              ? "whole-state search"
              : `${parsedCities.length} ${parsedCities.length === 1 ? "city" : "cities"}`}
            )
            </span>
          </span>
          <span className="text-xs sm:text-sm font-bold tabular-nums">
            Limit {LEAD_FINDER_MAX_COMBINATIONS}
            {combinationOk ? " ✓" : ""}
          </span>
        </div>

        {cityMode === "specific" && parsedCities.length === 0 ? (
          <p className="text-sm text-amber-400 font-medium" role="alert">
            Add at least one city below, or switch to <strong className="font-bold">All cities in each state</strong>.
          </p>
        ) : null}

        {!combinationOk && combinationCount > LEAD_FINDER_MAX_COMBINATIONS ? (
          <p className="text-sm text-amber-400 font-medium" role="alert">
            Too many combinations ({combinationCount}). Narrow industries, states, or cities — or run separate searches (max{" "}
            {LEAD_FINDER_MAX_COMBINATIONS}).
          </p>
        ) : null}
        {!combinationOk &&
        combinationCount > 0 &&
        combinationCount <= LEAD_FINDER_MAX_COMBINATIONS ? (
          <p className="text-sm text-amber-400 font-medium" role="alert">
            {cityMode === "specific"
              ? "Pick at least one industry, one state, and one city."
              : "Pick at least one industry and one state."}
          </p>
        ) : null}

        <button type="submit" disabled={loading || !combinationOk} className="dash-btn-primary w-full sm:w-auto min-h-[52px] text-lg disabled:opacity-50">
          {loading ? "Searching…" : "Search for leads"}
        </button>
        {error ? (
          <p className="text-sm text-red-400 font-medium" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-heading)] tracking-tight">Results</h2>
            <p className="mt-1 text-sm text-[var(--color-body-muted)] font-medium max-w-xl">
              Each row includes an email scraped from that company&apos;s website. Use{" "}
              <strong className="text-[var(--color-heading)]">Approve</strong> for one company or{" "}
              <strong className="text-[var(--color-heading)]">Add all</strong> for the preview list.
              Duplicates skip automatically.
            </p>
          </div>
          {result ? (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <span className="text-xs font-semibold text-[var(--color-muted)] whitespace-nowrap text-right leading-relaxed">
                {result.run.result_count} leads ·{" "}
                {result.run.places_text_search_calls != null ? (
                  <span title="Billable-ish: one Google Places Text Search per combination">
                    {result.run.places_text_search_calls} Places searches
                  </span>
                ) : (
                  <span className="text-[var(--color-muted)]">Places searches unknown (older run)</span>
                )}{" "}
                · {result.run.status}
              </span>
              <button
                type="button"
                disabled={
                  addAllBusy || candidates.filter((c) => c.status === "preview").length === 0
                }
                onClick={() => void approveAllPreview()}
                className="dash-btn-secondary text-sm py-2.5 px-4 min-h-0 disabled:opacity-50"
              >
                {addAllBusy ? "Adding…" : "Add all to Leads"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
          <table className="min-w-[1280px] w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wide text-[var(--color-muted)] bg-[var(--color-surface-1)]">
              <tr>
                <th className="px-3 py-3 font-bold">Score</th>
                <th className="px-3 py-3 font-bold">Company</th>
                <th className="px-3 py-3 font-bold">Location</th>
                <th className="px-3 py-3 font-bold">Phone</th>
                <th className="px-3 py-3 font-bold">Email</th>
                <th className="px-3 py-3 font-bold">Website</th>
                <th className="px-3 py-3 font-bold">Industry</th>
                <th className="px-3 py-3 font-bold">Assets</th>
                <th className="px-3 py-3 font-bold max-w-[200px]">Why</th>
                <th className="px-3 py-3 font-bold max-w-[180px]">Angle</th>
                <th className="px-3 py-3 font-bold">Map</th>
                <th className="px-3 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {candidates.map((c) => (
                <tr key={c.id} className="align-top hover:bg-[var(--color-surface-2)]/60">
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-[var(--color-body)]">
                    {assetScoreLabel(c)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[var(--color-heading)]">{c.company_name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{c.industry || "—"}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--color-body)]">
                    {c.city || "—"}, {c.state || "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-body-muted)]">{c.phone || "—"}</td>
                  <td className="px-3 py-3">
                    {(c.email || "").trim() ? (
                      <a
                        className="text-xs text-[var(--color-accent-muted)] hover:underline font-medium break-all"
                        href={`mailto:${String(c.email).trim()}`}
                      >
                        {String(c.email).trim()}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {c.website?.trim() ? (
                      <a
                        className="text-[var(--color-accent-muted)] hover:underline font-medium text-xs"
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-body-muted)] max-w-[9rem] text-xs">
                    {c.target_industry ?? result?.run.industry ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-body-muted)] max-w-[10rem] text-xs leading-relaxed">
                    {(c.likely_asset_types ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-body-muted)] text-xs leading-relaxed max-w-[200px]">
                    {c.reason_selected || c.score_explanation || "—"}
                    {c.enrichment_summary ? (
                      <div className="mt-2 text-[11px] text-[var(--color-muted)] border-t border-[var(--color-border)]/60 pt-2">
                        {c.enrichment_summary}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-body-muted)] text-xs leading-relaxed max-w-[180px]">
                    {c.outreach_angle ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {c.source_url ? (
                      <a
                        className="text-xs text-[var(--color-accent-muted)] hover:underline font-medium"
                        href={c.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {c.status === "preview" ? (
                      <button
                        type="button"
                        disabled={approving === c.id}
                        className="dash-btn-primary px-3 py-2 text-xs shadow-none min-h-0 disabled:opacity-50"
                        onClick={() => void approve(c.id)}
                      >
                        {approving === c.id ? "Saving…" : "Approve"}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">{c.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !result && candidates.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm font-medium text-[var(--color-body-muted)]">
              Nothing here yet — complete the three steps above, then tap{" "}
              <strong className="text-[var(--color-heading)]">Search for leads</strong>.
            </div>
          ) : null}
          {!loading && result && candidates.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm font-medium text-[var(--color-body-muted)] space-y-2">
              <p>
                No companies with a qualified contact email in this batch (we only keep addresses scraped from business
                sites).
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Try a wider search setup, increase &ldquo;rows per search&rdquo;, or pick categories whose sites commonly
                list email.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
