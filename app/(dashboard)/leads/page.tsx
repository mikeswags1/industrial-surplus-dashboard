"use client";

import { AddLeadModal } from "@/components/add-lead-modal";
import { ImportLeadsCsv } from "@/components/import-leads-csv";
import { LeadsTable } from "@/components/leads-table";
import Link from "next/link";
import { useLeads } from "@/context/leads-context";
import { CSV_LEAD_HEADERS } from "@/lib/leads/csv";

function backendLabel(
  mode: "loading" | "remote" | "unconfigured" | "error",
  message: string | null
) {
  if (mode === "loading") return "Connecting…";
  if (mode === "remote") return "Supabase (server)";
  if (mode === "unconfigured") return "Not configured — add env keys and migrations";
  return message ? `Error: ${message}` : "API error — check server logs";
}

export default function LeadsPage() {
  const { dataSource, backendMessage, refresh } = useLeads();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500 max-w-xl">
            Every row is a prospect you deliberately saved — from Lead Finder, CSV import, or
            manually. Use filters and bulk actions so the list doubles as your email follow-up lane.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600">
            <span>
              Backend:{" "}
              <span className="text-zinc-400">{backendLabel(dataSource, backendMessage)}</span>
            </span>
            {dataSource === "remote" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-[var(--color-accent)] hover:underline"
              >
                Refresh list
              </button>
            ) : dataSource === "unconfigured" || dataSource === "error" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-[var(--color-accent)] hover:underline"
              >
                Re-check
              </button>
            ) : null}
            <Link href="/send-emails" className="text-[var(--color-accent)] hover:underline">
              Go send emails →
            </Link>
          </div>
        </div>
        <AddLeadModal />
      </div>

      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 text-sm group">
        <summary className="cursor-pointer font-medium text-zinc-400 list-none flex items-center gap-2">
          <span className="opacity-70 group-open:rotate-90 transition-transform">▸</span>
          Advanced: import CSV backup
        </summary>
        <div className="mt-4 space-y-3 text-xs text-zinc-500 border-t border-[var(--color-border)] pt-4">
          <p>
            Required CSV header row:{" "}
            <code className="text-zinc-400 break-all">{CSV_LEAD_HEADERS.join(",")}</code>
          </p>
          <ImportLeadsCsv />
        </div>
      </details>

      <LeadsTable />
    </div>
  );
}
