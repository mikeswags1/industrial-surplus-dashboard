"use client";

import { ImportProjectSignalsCsv } from "@/components/import-project-signals-csv";
import { PageHeader } from "@/components/page-header";
import { ProjectSignalModal } from "@/components/project-signal-modal";
import { DashCard } from "@/components/dash-card";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import {
  PROJECT_SIGNAL_LEAD_STATUSES,
  PROJECT_SIGNAL_SOURCE_LABELS,
  PROJECT_SIGNAL_TYPES,
} from "@/lib/project-signals/constants";
import type { ProjectSignalLead, ProjectSignalLeadInput } from "@/lib/project-signals/types";
import { US_STATES } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Filters = {
  state: string;
  project_type: string;
  source_type: string;
  lead_status: string;
  min_confidence: string;
  created_from: string;
  created_to: string;
  q: string;
};

const EMPTY_FILTERS: Filters = {
  state: "",
  project_type: "",
  source_type: "",
  lead_status: "",
  min_confidence: "",
  created_from: "",
  created_to: "",
  q: "",
};

export default function ProjectSignalsPage() {
  const [leads, setLeads] = useState<ProjectSignalLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [active, setActive] = useState<ProjectSignalLead | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{
    inserted: number;
    candidates_found: number;
    skipped_duplicate: number;
    errors: string[];
    sample_titles: string[];
  } | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.state) p.set("state", filters.state);
    if (filters.project_type) p.set("project_type", filters.project_type);
    if (filters.source_type) p.set("source_type", filters.source_type);
    if (filters.lead_status) p.set("lead_status", filters.lead_status);
    if (filters.min_confidence) p.set("min_confidence", filters.min_confidence);
    if (filters.created_from) p.set("created_from", filters.created_from);
    if (filters.created_to) p.set("created_to", filters.created_to);
    if (filters.q.trim()) p.set("q", filters.q.trim());
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = queryString ? `?${queryString}` : "";
      const res = await dashboardFetch(`/api/project-signals${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load project signals");
      setLeads(json.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setActive(null);
    setModalMode("create");
    setModalError(null);
    setModalOpen(true);
  }

  function openView(lead: ProjectSignalLead) {
    setActive(lead);
    setModalMode("view");
    setModalError(null);
    setModalOpen(true);
  }

  function openEdit(lead: ProjectSignalLead) {
    setActive(lead);
    setModalMode("edit");
    setModalError(null);
    setModalOpen(true);
  }

  async function saveLead(input: ProjectSignalLeadInput) {
    setSaving(true);
    setModalError(null);
    try {
      if (modalMode === "create") {
        const res = await dashboardFetch("/api/project-signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");
      } else if (active) {
        const res = await dashboardFetch(`/api/project-signals/${active.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Update failed");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead() {
    if (!active) return;
    const ok = confirm(`Delete project signal "${active.project_name}"?`);
    if (!ok) return;
    setSaving(true);
    setModalError(null);
    try {
      const res = await dashboardFetch(`/api/project-signals/${active.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setModalOpen(false);
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const qs = queryString ? `?${queryString}` : "";
    window.open(`/api/project-signals/export${qs}`, "_blank");
  }

  async function runDiscovery() {
    setDiscovering(true);
    setError(null);
    setDiscoverResult(null);
    try {
      const res = await dashboardFetch("/api/project-signals/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: filters.state || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Discovery failed");
      setDiscoverResult(json);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Project Signals"
        description="Automatically discovers construction, shutdown, upgrade, and data-center project signals from public news — scored and saved with source links. Manual entry is only a fallback."
      >
        <button
          type="button"
          disabled={discovering}
          onClick={() => void runDiscovery()}
          className="dash-btn-primary disabled:opacity-50"
        >
          {discovering ? "Scanning news…" : "Run discovery scan"}
        </button>
      </PageHeader>

      <DashCard className="p-4 sm:p-5 space-y-3">
        <p className="text-sm text-[var(--color-body-muted)] leading-relaxed">
          Discovery scans <strong className="text-[var(--color-heading)]">Google News</strong> for the last ~3 months
          across {10} surplus-relevant project categories (data centers, shutdowns, demolition, utility upgrades, etc.).
          Each hit must include a real <strong className="text-[var(--color-heading)]">article URL</strong> — nothing is
          fabricated. Optional: pick a <strong className="text-[var(--color-heading)]">State</strong> filter below before
          scanning to narrow geography.
        </p>
        {discoverResult ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-[var(--color-body)] space-y-1">
            <p>
              <strong className="text-[var(--color-heading)]">{discoverResult.inserted}</strong> new signal
              {discoverResult.inserted === 1 ? "" : "s"} added · {discoverResult.candidates_found} candidates ·{" "}
              {discoverResult.skipped_duplicate} duplicates skipped
            </p>
            {discoverResult.sample_titles.length ? (
              <ul className="text-xs text-[var(--color-body-muted)] list-disc pl-4 space-y-0.5">
                {discoverResult.sample_titles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
            {discoverResult.errors.length ? (
              <p className="text-xs text-amber-300/90">{discoverResult.errors.slice(0, 3).join(" · ")}</p>
            ) : null}
          </div>
        ) : null}
      </DashCard>

      <DashCard className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Search name</span>
            <input
              className="dash-input py-2 text-sm min-w-[10rem]"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Project name…"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">State</span>
            <select
              className="dash-input py-2 text-sm"
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            >
              <option value="">All</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Project type</span>
            <select
              className="dash-input py-2 text-sm max-w-[14rem]"
              value={filters.project_type}
              onChange={(e) => setFilters({ ...filters, project_type: e.target.value })}
            >
              <option value="">All</option>
              {PROJECT_SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Source type</span>
            <select
              className="dash-input py-2 text-sm"
              value={filters.source_type}
              onChange={(e) => setFilters({ ...filters, source_type: e.target.value })}
            >
              <option value="">All</option>
              {Object.entries(PROJECT_SIGNAL_SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Outreach status</span>
            <select
              className="dash-input py-2 text-sm"
              value={filters.lead_status}
              onChange={(e) => setFilters({ ...filters, lead_status: e.target.value })}
            >
              <option value="">All</option>
              {PROJECT_SIGNAL_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Min confidence</span>
            <input
              type="number"
              min={0}
              max={100}
              className="dash-input py-2 text-sm w-24"
              value={filters.min_confidence}
              onChange={(e) => setFilters({ ...filters, min_confidence: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Added from</span>
            <input
              type="date"
              className="dash-input py-2 text-sm"
              value={filters.created_from}
              onChange={(e) => setFilters({ ...filters, created_from: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--color-muted)]">Added to</span>
            <input
              type="date"
              className="dash-input py-2 text-sm"
              value={filters.created_to}
              onChange={(e) => setFilters({ ...filters, created_to: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => void load()} className="dash-btn-secondary text-sm py-2">
            Apply
          </button>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="dash-btn-secondary text-sm py-2"
          >
            Clear
          </button>
          <button type="button" onClick={exportCsv} className="dash-btn-secondary text-sm py-2 ml-auto">
            Export CSV
          </button>
        </div>
      </DashCard>

      <details className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-card)]">
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-heading)]">
          Manual fallback — add one or import CSV
        </summary>
        <div className="mt-4 space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
          <button type="button" onClick={openCreate} className="dash-btn-secondary text-sm">
            Add signal manually
          </button>
          <ImportProjectSignalsCsv onImported={() => void load()} />
        </div>
      </details>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wide text-[var(--color-muted)] bg-[var(--color-surface-1)]">
            <tr>
              <th className="px-3 py-3 font-bold">Scores</th>
              <th className="px-3 py-3 font-bold">Project</th>
              <th className="px-3 py-3 font-bold">Type</th>
              <th className="px-3 py-3 font-bold">Location</th>
              <th className="px-3 py-3 font-bold">Source</th>
              <th className="px-3 py-3 font-bold">Phase</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">Added</th>
              <th className="px-3 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[var(--color-muted)]">
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[var(--color-body-muted)]">
                  No project signals yet. Click <strong className="text-[var(--color-heading)]">Run discovery scan</strong>{" "}
                  to pull recent news hits with source links — or use manual fallback below.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="align-top hover:bg-[var(--color-surface-2)]/60">
                  <td className="px-3 py-3 whitespace-nowrap text-xs tabular-nums">
                    <div className="font-semibold text-[var(--color-heading)]">{l.lead_score}/100</div>
                    <div className="text-[var(--color-muted)]">conf {l.confidence_score}</div>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="font-semibold text-[var(--color-heading)] text-left hover:underline"
                      onClick={() => openView(l)}
                    >
                      {l.project_name}
                    </button>
                    {l.is_demo ? (
                      <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                        DEMO
                      </span>
                    ) : null}
                    {l.equipment_opportunity ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)] line-clamp-2">
                        {l.equipment_opportunity}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--color-body-muted)] max-w-[9rem]">
                    {l.project_type}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--color-body)]">
                    {l.location || "—"}
                    {l.state ? `, ${l.state}` : ""}
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--color-body-muted)]">
                    {PROJECT_SIGNAL_SOURCE_LABELS[l.source_type] ?? l.source_type}
                    {l.source_url ? (
                      <a
                        href={l.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-1 text-[var(--color-accent-muted)] hover:underline"
                      >
                        Source link
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs">{l.project_status}</td>
                  <td className="px-3 py-3 text-xs">{l.lead_status}</td>
                  <td className="px-3 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">
                    {l.created_at.slice(0, 10)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="dash-btn-secondary text-xs py-1.5 px-2 min-h-0"
                        onClick={() => openEdit(l)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProjectSignalModal
        open={modalOpen}
        mode={modalMode}
        initial={active}
        saving={saving}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSave={saveLead}
        onDelete={modalMode === "edit" ? deleteLead : undefined}
      />
    </div>
  );
}
