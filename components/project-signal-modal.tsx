"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PROJECT_SIGNAL_LEAD_STATUSES,
  PROJECT_SIGNAL_PROJECT_STATUSES,
  PROJECT_SIGNAL_SOURCE_LABELS,
  PROJECT_SIGNAL_SOURCE_TYPES,
  PROJECT_SIGNAL_TYPES,
} from "@/lib/project-signals/constants";
import type { ProjectSignalLead, ProjectSignalLeadInput } from "@/lib/project-signals/types";
import { US_STATES } from "@/lib/types";

export const EMPTY_PROJECT_SIGNAL: ProjectSignalLeadInput = {
  project_name: "",
  project_type: PROJECT_SIGNAL_TYPES[0],
  source_type: "manual",
  location: "",
  state: "TX",
  contact_name: "",
  contact_email: "",
  phone: "",
  website: "",
  source_url: "",
  project_status: "Unknown",
  estimated_value: null,
  estimated_start_date: null,
  estimated_completion_date: null,
  equipment_opportunity: "",
  notes: "",
  lead_status: "New",
  is_demo: false,
};

type Props = {
  open: boolean;
  mode: "create" | "edit" | "view";
  initial: ProjectSignalLead | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: ProjectSignalLeadInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function leadToInput(lead: ProjectSignalLead): ProjectSignalLeadInput {
  return {
    project_name: lead.project_name,
    project_type: lead.project_type,
    source_type: lead.source_type,
    location: lead.location,
    state: lead.state,
    contact_name: lead.contact_name,
    contact_email: lead.contact_email,
    phone: lead.phone,
    website: lead.website,
    source_url: lead.source_url,
    project_status: lead.project_status,
    estimated_value: lead.estimated_value,
    estimated_start_date: lead.estimated_start_date,
    estimated_completion_date: lead.estimated_completion_date,
    equipment_opportunity: lead.equipment_opportunity,
    notes: lead.notes,
    lead_status: lead.lead_status,
    is_demo: lead.is_demo,
  };
}

export function ProjectSignalModal({
  open,
  mode,
  initial,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<ProjectSignalLeadInput>(EMPTY_PROJECT_SIGNAL);

  useEffect(() => {
    if (open) {
      setForm(initial ? leadToInput(initial) : EMPTY_PROJECT_SIGNAL);
    }
  }, [open, initial]);

  if (!open) return null;

  const readOnly = mode === "view";
  const title =
    mode === "create" ? "Add project signal" : mode === "edit" ? "Edit project signal" : "Project signal";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    await onSave({
      ...form,
      source_type: form.is_demo ? "demo" : form.source_type,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-4">
      <div
        className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-card)] max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">{title}</h2>
            {initial?.is_demo ? (
              <span className="mt-1 inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                Demo sample
              </span>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-body)]">
            Close
          </button>
        </div>

        {initial && mode !== "create" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs text-[var(--color-body-muted)]">
            <div>
              Confidence: <strong className="text-[var(--color-heading)]">{initial.confidence_score}/100</strong>
            </div>
            <div>
              Lead score: <strong className="text-[var(--color-heading)]">{initial.lead_score}/100</strong>
            </div>
            {initial.reason_flagged ? (
              <p className="sm:col-span-2 leading-relaxed">{initial.reason_flagged}</p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Project / company name *</span>
            <input
              required
              readOnly={readOnly}
              className="dash-input"
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Project type *</span>
            <select
              disabled={readOnly}
              className="dash-input"
              value={form.project_type}
              onChange={(e) => setForm({ ...form, project_type: e.target.value })}
            >
              {PROJECT_SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Source type *</span>
            <select
              disabled={readOnly || form.is_demo}
              className="dash-input"
              value={form.is_demo ? "demo" : form.source_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  source_type: e.target.value as ProjectSignalLeadInput["source_type"],
                })
              }
            >
              {PROJECT_SIGNAL_SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROJECT_SIGNAL_SOURCE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">State</span>
            <select
              disabled={readOnly}
              className="dash-input"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Location (city / address)</span>
            <input
              readOnly={readOnly}
              className="dash-input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Project status (construction phase)</span>
            <select
              disabled={readOnly}
              className="dash-input"
              value={form.project_status}
              onChange={(e) => setForm({ ...form, project_status: e.target.value })}
            >
              {PROJECT_SIGNAL_PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Outreach status</span>
            <select
              disabled={readOnly}
              className="dash-input"
              value={form.lead_status}
              onChange={(e) =>
                setForm({ ...form, lead_status: e.target.value as ProjectSignalLeadInput["lead_status"] })
              }
            >
              {PROJECT_SIGNAL_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Contact name</span>
            <input
              readOnly={readOnly}
              className="dash-input"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Contact email</span>
            <input
              readOnly={readOnly}
              type="email"
              className="dash-input"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Phone</span>
            <input
              readOnly={readOnly}
              className="dash-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Website</span>
            <input
              readOnly={readOnly}
              className="dash-input"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">
              Source URL (required for real signals unless source is Manual / CSV import)
            </span>
            <input
              readOnly={readOnly}
              className="dash-input"
              placeholder="https://…"
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Est. value ($)</span>
            <input
              readOnly={readOnly}
              type="number"
              className="dash-input"
              value={form.estimated_value ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  estimated_value: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Est. start date</span>
            <input
              readOnly={readOnly}
              type="date"
              className="dash-input"
              value={form.estimated_start_date ?? ""}
              onChange={(e) => setForm({ ...form, estimated_start_date: e.target.value || null })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Est. completion date</span>
            <input
              readOnly={readOnly}
              type="date"
              className="dash-input"
              value={form.estimated_completion_date ?? ""}
              onChange={(e) =>
                setForm({ ...form, estimated_completion_date: e.target.value || null })
              }
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Equipment opportunity</span>
            <textarea
              readOnly={readOnly}
              rows={2}
              className="dash-input resize-y"
              placeholder="Switchgear, transformers, scrap removal, …"
              value={form.equipment_opportunity}
              onChange={(e) => setForm({ ...form, equipment_opportunity: e.target.value })}
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-body-muted)]">Notes</span>
            <textarea
              readOnly={readOnly}
              rows={3}
              className="dash-input resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={form.is_demo}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_demo: e.target.checked,
                  source_type: e.target.checked ? "demo" : "manual",
                })
              }
            />
            <span className="text-[var(--color-body-muted)]">
              Mark as demo / sample data (not a verified live project)
            </span>
          </label>

          {error ? (
            <p className="sm:col-span-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
            {mode === "view" ? (
              <button type="button" className="dash-btn-secondary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="dash-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                {mode === "edit" && onDelete ? (
                  <button
                    type="button"
                    disabled={saving}
                    className="ml-auto text-sm text-red-400 hover:text-red-300"
                    onClick={() => void onDelete()}
                  >
                    Delete
                  </button>
                ) : null}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
