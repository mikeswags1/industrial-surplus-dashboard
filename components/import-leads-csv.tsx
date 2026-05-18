"use client";

import { useRef, useState } from "react";
import { useLeads } from "@/context/leads-context";
import { CSV_LEAD_HEADERS } from "@/lib/leads/csv";
import { dashboardFetch } from "@/lib/dashboard-fetch";

const TEMPLATE_CSV = `${CSV_LEAD_HEADERS.join(",")}\n`;

export function ImportLeadsCsv() {
  const { dataSource, importFromCsvText } = useLeads();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      const text = await f.text();
      const tag = f.name.replace(/[^\w.-]/g, "_").slice(0, 64);

      const previewRes = await dashboardFetch("/api/leads/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text, tag }),
      });
      const previewJson = (await previewRes.json()) as {
        errors?: { line: number; message: string }[];
        summary?: {
          totalDataRows: number;
          insert: number;
          skip_duplicate: number;
          invalid: number;
        };
        error?: string;
      };

      if (!previewRes.ok) {
        const first = previewJson.errors?.[0];
        throw new Error(first?.message ?? previewJson.error ?? "Preview failed");
      }

      const s = previewJson.summary;
      if (s && s.invalid > 0) {
        setMsg(
          `Import blocked: ${s.invalid} invalid row(s), ${s.skip_duplicate} duplicate(s), ${s.insert} would import. Fix CSV and try again.`
        );
        return;
      }

      if (s) {
        setMsg(
          `Validated ${s.totalDataRows} row(s): ${s.insert} new, ${s.skip_duplicate} duplicate(s). Importing…`
        );
      }

      const res = await importFromCsvText(text, tag);
      const detail =
        res.rowErrors.length > 0
          ? ` ${res.rowErrors.length} row error(s): ${res.rowErrors
              .slice(0, 3)
              .map((r) => `line ${r.line}: ${r.message}`)
              .join("; ")}${res.rowErrors.length > 3 ? " …" : ""}`
          : "";
      setMsg(`Imported ${res.inserted}, skipped ${res.skipped} duplicates.${detail}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (dataSource !== "remote") {
    return (
      <p className="text-xs text-zinc-500 max-w-md">
        CSV import uses the server API. Set{" "}
        <code className="text-zinc-400">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
        <code className="text-zinc-400">NEXT_PUBLIC_SUPABASE_URL</code>, run the SQL
        migrations in order (<code className="text-zinc-400">schema.sql</code>, then{" "}
        <code className="text-zinc-400">002</code>, then <code className="text-zinc-400">003</code>
        ), then refresh.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-0)] file:px-3 file:py-1.5 file:text-sm file:text-zinc-200"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={busy}
        className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-300 hover:bg-[var(--color-surface-2)] disabled:opacity-50"
        onClick={() => {
          const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "leads-import-template.csv";
          a.click();
          URL.revokeObjectURL(a.href);
        }}
      >
        Download CSV template (headers only)
      </button>
      {busy ? <span className="text-xs text-zinc-500">Working…</span> : null}
      {msg ? (
        <span className="text-xs text-zinc-400" role="status">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
