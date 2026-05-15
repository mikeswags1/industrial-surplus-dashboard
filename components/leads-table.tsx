"use client";

import { useMemo, useState } from "react";
import { DashCard } from "@/components/dash-card";
import type { LeadStatus } from "@/lib/types";
import { LEAD_STATUSES, EQUIPMENT_TYPES, US_STATES } from "@/lib/types";
import { useLeads } from "@/context/leads-context";

const EMAIL_STATUS_FILTERS = [
  "All",
  "No Email Sent",
  "Email Sent",
  "No Response",
  "Replied",
  "Interested",
  "Deal Won",
  "Not Interested",
] as const;

function matchesEmailFilter(label: string | undefined, filter: string) {
  if (filter === "All") return true;
  const L = label ?? "No Email Sent";
  if (filter === "No Response") return L.startsWith("No Response");
  return L === filter;
}

function formatLikelyAssets(types: string[] | null | undefined) {
  const a = types ?? [];
  return a.length ? a.join(", ") : "—";
}

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function LeadsTable() {
  const {
    leads,
    updateLead,
    bulkSetStatus,
    bulkMarkReplied,
    dataSource,
    enrichLead,
  } = useLeads();

  const [q, setQ] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState<LeadStatus | "All">("All");
  const [emailFilter, setEmailFilter] = useState<(typeof EMAIL_STATUS_FILTERS)[number]>("All");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [equipment, setEquipment] = useState<string>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (pipelineStatus !== "All" && l.status !== pipelineStatus) return false;
      if (!matchesEmailFilter(l.email_status_label, emailFilter)) return false;
      if (stateFilter !== "All" && l.state !== stateFilter) return false;
      if (equipment !== "All" && l.equipment_type !== equipment) return false;
      if (!needle) return true;
      const blob = [
        l.company_name,
        l.contact_name,
        l.email,
        l.phone,
        l.city,
        l.industry,
        l.target_industry ?? "",
        (l.likely_asset_types ?? []).join(" "),
        l.email_status_label ?? "",
        l.notes,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [leads, q, pipelineStatus, emailFilter, stateFilter, equipment]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((l) => l.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-5">
      <DashCard className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex flex-col gap-2 min-w-[200px] flex-1">
          <span className="dash-label">Search</span>
          <input
            placeholder="Company, email, phone, industry, notes…"
            className="dash-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 w-full sm:w-44">
          <span className="dash-label">Email status</span>
          <select
            className="dash-input"
            value={emailFilter}
            onChange={(e) =>
              setEmailFilter(e.target.value as (typeof EMAIL_STATUS_FILTERS)[number])
            }
          >
            {EMAIL_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 w-full sm:w-40">
          <span className="dash-label">Pipeline status</span>
          <select
            className="dash-input"
            value={pipelineStatus}
            onChange={(e) =>
              setPipelineStatus(e.target.value as LeadStatus | "All")
            }
          >
            <option>All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 w-full sm:w-32">
          <span className="dash-label">State</span>
          <select
            className="dash-input"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option>All</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 w-full sm:w-48">
          <span className="dash-label">Equipment</span>
          <select
            className="dash-input"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            <option>All</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      </DashCard>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={selectAllFiltered}
          className="dash-btn-secondary px-3 py-1.5 text-xs"
        >
          Select all ({filtered.length})
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="dash-btn-secondary px-3 py-1.5 text-xs opacity-80"
        >
          Clear selection
        </button>
        {selectedIds.length > 0 ? (
          <>
            <span className="text-[var(--color-body-muted)] text-xs px-1">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className="rounded-lg border border-emerald-800/45 bg-emerald-950/35 px-3 py-1.5 text-emerald-200 text-xs font-medium hover:bg-emerald-950/50 transition-colors"
              onClick={() =>
                void bulkMarkReplied(selectedIds).then(clearSelection).catch((e) =>
                  alert(e instanceof Error ? e.message : "Failed")
                )
              }
            >
              Record reply
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-1.5 text-amber-100 text-xs font-medium hover:bg-amber-950/45 transition-colors"
              onClick={() =>
                void bulkSetStatus(selectedIds, "Interested")
                  .then(clearSelection)
                  .catch((e) => alert(e instanceof Error ? e.message : "Failed"))
              }
            >
              Mark interested
            </button>
            <button
              type="button"
              className="dash-btn-secondary px-3 py-1.5 text-xs"
              onClick={() =>
                void bulkSetStatus(selectedIds, "Not Interested")
                  .then(clearSelection)
                  .catch((e) => alert(e instanceof Error ? e.message : "Failed"))
              }
            >
              Not interested
            </button>
          </>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
            <tr>
              <th className="px-2 py-3 w-10 font-medium">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-3 py-3 font-medium">Company</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">Target industry</th>
              <th className="px-3 py-3 font-medium max-w-[9rem]">Likely assets</th>
              <th className="px-3 py-3 font-medium">Email status</th>
              <th className="px-3 py-3 font-medium">Last sent</th>
              <th className="px-3 py-3 font-medium">Reply</th>
              <th className="px-3 py-3 font-medium max-w-[8rem]">Pipeline</th>
              <th className="px-3 py-3 font-medium w-20">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-[var(--color-surface-2)]/60 align-top">
                <td className="px-2 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggleSelected(l.id)}
                    aria-label={`Select ${l.company_name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-[var(--color-heading)]">{l.company_name}</div>
                  {l.website?.trim() ? (
                    <a
                      className="text-xs text-[var(--color-accent-hover)] hover:underline break-all block max-w-[200px]"
                      href={
                        l.website.startsWith("http") ? l.website : `https://${l.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.website}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div>{l.phone || "—"}</div>
                  <div className="text-xs text-zinc-500 break-all">{l.email || "—"}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {l.city}, {l.state}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400 max-w-[8rem]">
                  {l.target_industry ?? "—"}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500 max-w-[9rem] leading-relaxed">
                  {formatLikelyAssets(l.likely_asset_types)}
                </td>
                <td className="px-3 py-3 text-xs whitespace-nowrap">
                  <span
                    className={
                      l.email_status_label?.startsWith("No Response")
                        ? "text-amber-400"
                        : l.email_status_label === "Replied" || l.email_status_label === "Interested"
                          ? "text-emerald-400"
                          : l.email_status_label === "Email Sent"
                            ? "text-sky-400"
                            : "text-zinc-400"
                    }
                  >
                    {l.email_status_label ?? "No Email Sent"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs whitespace-nowrap tabular-nums">
                  <span>{formatShortDate(l.last_email_sent_at)}</span>
                  {(l.email_send_count ?? 0) > 1 ? (
                    <span className="ml-1 text-zinc-500">×{l.email_send_count}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-xs whitespace-nowrap tabular-nums">
                  <span>{formatShortDate(l.reply_logged_at)}</span>
                  {(l.inbound_reply_count ?? 0) > 1 ? (
                    <span className="ml-1 text-zinc-500">×{l.inbound_reply_count}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <select
                    className="max-w-[160px] dash-input py-1.5 text-xs"
                    value={l.status}
                    onChange={(e) => {
                      void updateLead(l.id, {
                        status: e.target.value as LeadStatus,
                      });
                    }}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--color-accent-hover)] hover:underline"
                    title={l.notes || "No notes"}
                    onClick={() => {
                      const t = prompt("Notes / status scratchpad", l.notes || "");
                      if (t !== null) void updateLead(l.id, { notes: t });
                    }}
                  >
                    Edit
                  </button>
                  {dataSource === "remote" && l.website?.trim() ? (
                    <button
                      type="button"
                      className="block mt-1 text-xs text-zinc-500 hover:underline"
                      onClick={() =>
                        void enrichLead(l.id).catch((e) =>
                          alert(e instanceof Error ? e.message : "Enrich failed")
                        )
                      }
                    >
                      Enrich
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-body-muted)]">
            No leads match these filters — use Lead Finder to add real prospects.
          </div>
        ) : null}
      </div>
    </div>
  );
}
