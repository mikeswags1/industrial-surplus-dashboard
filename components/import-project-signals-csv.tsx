"use client";

import { useState } from "react";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import { CSV_PROJECT_SIGNAL_HEADERS } from "@/lib/project-signals/csv";

type Props = {
  onImported: () => void;
};

export function ImportProjectSignalsCsv({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const csvText = await file.text();
      const preview = await dashboardFetch("/api/project-signals/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const previewJson = await preview.json();
      if (!preview.ok) {
        throw new Error(
          previewJson.errors?.[0]?.message ?? previewJson.error ?? "Preview failed"
        );
      }

      const res = await dashboardFetch("/api/project-signals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.errors?.[0]?.message ?? json.error ?? "Import failed");
      }
      setMsg(`Imported ${json.inserted ?? 0} row(s). ${json.rowErrors?.length ?? 0} error(s).`);
      onImported();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-muted)]">
        Required columns: <code className="text-[var(--color-body)]">project_name</code>,{" "}
        <code className="text-[var(--color-body)]">project_type</code>,{" "}
        <code className="text-[var(--color-body)]">source_type</code>. Real rows need a{" "}
        <code className="text-[var(--color-body)]">source_url</code> or manual/csv source. Set{" "}
        <code className="text-[var(--color-body)]">is_demo</code> to true for samples.
      </p>
      <p className="text-xs text-[var(--color-muted)] break-all">
        Full header: {CSV_PROJECT_SIGNAL_HEADERS.join(", ")}
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        className="text-sm text-[var(--color-body-muted)]"
      />
      {busy ? <p className="text-sm text-[var(--color-muted)]">Importing…</p> : null}
      {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
      {err ? (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
