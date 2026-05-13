"use client";

import { useRef, useState } from "react";
import { useLeads } from "@/context/leads-context";
import { CSV_LEAD_HEADERS } from "@/lib/leads/csv";

const SAMPLE = `${CSV_LEAD_HEADERS.join(",")}
"Acme Manufacturing","Jane Doe","jane@acme.com","555-0100","https://acme.com","Manufacturing","TX","Houston","Forklifts",250000,"New","Met at trade show","CSV Import"`;

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
      const res = await importFromCsvText(text, tag);
      setMsg(
        `Imported ${res.inserted}, skipped ${res.skipped} duplicates.${
          res.rowErrors.length
            ? ` ${res.rowErrors.length} row errors (see console).`
            : ""
        }`
      );
      if (res.rowErrors.length) console.warn(res.rowErrors);
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
        migrations, then refresh the page.
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
          const blob = new Blob([SAMPLE], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "leads-import-sample.csv";
          a.click();
          URL.revokeObjectURL(a.href);
        }}
      >
        Download sample CSV
      </button>
      {busy ? <span className="text-xs text-zinc-500">Importing…</span> : null}
      {msg ? (
        <span className="text-xs text-zinc-400" role="status">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
