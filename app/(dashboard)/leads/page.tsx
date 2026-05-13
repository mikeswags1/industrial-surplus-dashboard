import { AddLeadModal } from "@/components/add-lead-modal";
import { LeadsTable } from "@/components/leads-table";

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Filter and update statuses. Add rows for new prospects.
          </p>
        </div>
        <AddLeadModal />
      </div>
      <LeadsTable />
    </div>
  );
}
