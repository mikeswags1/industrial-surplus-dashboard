"use client";

import { useState, type FormEvent } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES, EQUIPMENT_TYPES, US_STATES } from "@/lib/types";
import { useLeads } from "@/context/leads-context";

const empty: Omit<Lead, "id" | "created_at" | "updated_at"> = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  state: "TX",
  city: "",
  lead_source: "Manual",
  equipment_type: EQUIPMENT_TYPES[0],
  estimated_value: null,
  status: "New",
  notes: "",
};

export function AddLeadModal() {
  const { addLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.email.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await addLead(form);
      setForm(empty);
      setOpen(false);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dash-btn-primary"
      >
        Add lead
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-card)] max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lead-title"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="add-lead-title" className="text-lg font-semibold">
                Add lead
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 text-sm"
              >
                Close
              </button>
            </div>
            <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Company</span>
                <input
                  required
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.company_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company_name: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Contact</span>
                <input
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact_name: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Email</span>
                <input
                  type="email"
                  required
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Phone</span>
                <input
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Website</span>
                <input
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Industry</span>
                <input
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.industry}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, industry: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">State</span>
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.state}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
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
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Lead source</span>
                <input
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.lead_source}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lead_source: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Equipment type</span>
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.equipment_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, equipment_type: e.target.value }))
                  }
                >
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Est. value (USD)</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.estimated_value ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimated_value: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Status</span>
                <select
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as LeadStatus,
                    }))
                  }
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-zinc-400">Notes</span>
                <textarea
                  rows={3}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              {err ? (
                <p className="sm:col-span-2 text-sm text-red-400" role="alert">
                  {err}
                </p>
              ) : null}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-zinc-300 hover:bg-[var(--color-surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="dash-btn-primary disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
