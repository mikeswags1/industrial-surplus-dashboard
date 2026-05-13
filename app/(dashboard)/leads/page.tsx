import { AddLeadModal } from "@/components/add-lead-modal";
import { ImportLeadsCsv } from "@/components/import-leads-csv";
import { LeadsTable } from "@/components/leads-table";
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
          <p className="mt-1 text-sm text-zinc-500">
            Only real leads you add, import, or load from Supabase appear here. No
            bundled demo companies.
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Data:{" "}
            <span className="text-zinc-400">{backendLabel(dataSource, backendMessage)}</span>
            {dataSource === "remote" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="ml-2 text-[var(--color-accent)] hover:underline"
              >
                Refresh
              </button>
            ) : dataSource === "unconfigured" || dataSource === "error" ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="ml-2 text-[var(--color-accent)] hover:underline"
              >
                Re-check
              </button>
            ) : null}
          </p>
        </div>
        <AddLeadModal />
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Import leads (CSV)</h2>
        <p className="text-xs text-zinc-500">
          Required header row:{" "}
          <code className="text-zinc-400 break-all">{CSV_LEAD_HEADERS.join(",")}</code>
        </p>
        <ImportLeadsCsv />
      </section>

      <LeadsTable />
    </div>
  );
}
