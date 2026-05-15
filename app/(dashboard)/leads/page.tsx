"use client";

import { AddLeadModal } from "@/components/add-lead-modal";
import { ImportLeadsCsv } from "@/components/import-leads-csv";
import { LeadsTable } from "@/components/leads-table";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { useLeads } from "@/context/leads-context";
import { CSV_LEAD_HEADERS } from "@/lib/leads/csv";
import { DashCard } from "@/components/dash-card";

function backendLabel(
  mode: "loading" | "remote" | "unconfigured" | "error",
  message: string | null
) {
  if (mode === "loading") return "Connecting…";
  if (mode === "remote") return "Supabase (connected)";
  if (mode === "unconfigured") return "Not configured — add env keys and migrations";
  return message ? `Error: ${message}` : "API error — check server logs";
}

export default function LeadsPage() {
  const { dataSource, backendMessage, refresh } = useLeads();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description="Prospect list. Filter, update status in bulk, or open Send email."
      >
        <AddLeadModal />
      </PageHeader>

      <DashCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[var(--color-body-muted)]">
            <span>
              Data:{" "}
              <span className="text-[var(--color-body)]">{backendLabel(dataSource, backendMessage)}</span>
            </span>
            {dataSource === "remote" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="dash-link"
              >
                Refresh list
              </button>
            ) : dataSource === "unconfigured" || dataSource === "error" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="dash-link"
              >
                Re-check connection
              </button>
            ) : null}
            <Link href="/send-emails" className="dash-link">
              Send emails →
            </Link>
          </div>
        </div>
      </DashCard>

      <details className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-card)] open:border-[rgba(255,255,255,0.1)] transition-colors">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-sm font-medium text-[var(--color-heading)]">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-surface-3)] text-[var(--color-muted)] text-xs group-open:rotate-90 transition-transform">
              ▸
            </span>
            Import leads from CSV
          </span>
          <span className="text-xs font-normal text-[var(--color-muted)]">Optional</span>
        </summary>
        <div className="mt-5 space-y-4 text-sm text-[var(--color-body-muted)] border-t border-[var(--color-border-subtle)] pt-5">
          <p>
            Header row must match:{" "}
            <code className="rounded bg-[var(--color-surface-0)] px-1.5 py-0.5 text-xs text-[var(--color-body)] break-all">
              {CSV_LEAD_HEADERS.join(",")}
            </code>
          </p>
          <ImportLeadsCsv />
        </div>
      </details>

      <LeadsTable />
    </div>
  );
}
