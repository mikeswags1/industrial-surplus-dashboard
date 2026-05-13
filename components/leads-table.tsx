"use client";

import { useMemo, useState } from "react";
import type { LeadStatus } from "@/lib/types";
import { LEAD_STATUSES, EQUIPMENT_TYPES, US_STATES } from "@/lib/types";
import { useLeads } from "@/context/leads-context";

export function LeadsTable() {
  const { leads, updateLead, dataSource, enrichLead } = useLeads();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "All">("All");
  const [state, setState] = useState<string>("All");
  const [equipment, setEquipment] = useState<string>("All");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "All" && l.status !== status) return false;
      if (state !== "All" && l.state !== state) return false;
      if (equipment !== "All" && l.equipment_type !== equipment) return false;
      if (!needle) return true;
      const blob = [
        l.company_name,
        l.contact_name,
        l.email,
        l.city,
        l.industry,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [leads, q, status, state, equipment]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex flex-col gap-1 text-sm min-w-[200px] flex-1">
          <span className="text-zinc-400">Search</span>
          <input
            placeholder="Company, contact, email, city…"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm w-full sm:w-40">
          <span className="text-zinc-400">Status</span>
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as LeadStatus | "All")
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
        <label className="flex flex-col gap-1 text-sm w-full sm:w-32">
          <span className="text-zinc-400">State</span>
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option>All</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm w-full sm:w-48">
          <span className="text-zinc-400">Equipment</span>
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
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

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-3 font-medium">Company</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">Equipment</th>
              <th className="px-3 py-3 font-medium">Est. value</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-[var(--color-surface-2)]/60">
                <td className="px-3 py-3">
                  <div className="font-medium text-zinc-100">
                    {l.company_name}
                  </div>
                  <div className="text-xs text-zinc-500 truncate max-w-[220px]">
                    {l.website || "—"}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div>{l.contact_name || "—"}</div>
                  <div className="text-xs text-zinc-500">{l.email}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {l.city}, {l.state}
                </td>
                <td className="px-3 py-3">{l.equipment_type}</td>
                <td className="px-3 py-3 tabular-nums">
                  {l.estimated_value != null
                    ? `$${l.estimated_value.toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  <select
                    className="max-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-2 py-1 text-xs"
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
                <td className="px-3 py-3 align-top">
                  {dataSource === "remote" && l.website?.trim() ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--color-accent)] hover:underline"
                      onClick={() =>
                        void enrichLead(l.id).catch((e) =>
                          alert(e instanceof Error ? e.message : "Enrich failed")
                        )
                      }
                    >
                      Enrich
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            No leads match these filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
