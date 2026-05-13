"use client";

import { StatCard } from "@/components/stat-card";
import { useLeads, countByStatus, pipelineValue } from "@/context/leads-context";
import { useCampaigns } from "@/context/campaigns-context";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function OverviewPage() {
  const { leads } = useLeads();
  const { campaigns } = useCampaigns();

  const total = leads.length;
  const newLeads = countByStatus(leads, "New");
  const contacted = countByStatus(leads, "Contacted");
  const interested = countByStatus(leads, "Interested");
  const won = countByStatus(leads, "Deal Won");
  const pipeline = pipelineValue(leads);

  const emailsSent = campaigns.reduce((s, c) => s + c.emails_sent, 0);
  const replies = campaigns.reduce((s, c) => s + c.replies_count, 0);
  const replyRate =
    emailsSent > 0 ? Math.round((replies / emailsSent) * 1000) / 10 : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          Snapshot of the lead pipeline and outbound activity. Data comes from
          Supabase when configured, otherwise the in-browser store.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Leads</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total leads" value={String(total)} />
          <StatCard title="New" value={String(newLeads)} />
          <StatCard title="Contacted" value={String(contacted)} />
          <StatCard title="Interested" value={String(interested)} />
          <StatCard title="Deals won" value={String(won)} />
          <StatCard
            title="Est. pipeline value"
            value={formatUsd(pipeline)}
            hint="Open pipeline statuses only"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Outreach</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Emails sent (campaigns)" value={String(emailsSent)} />
          <StatCard
            title="Reply rate"
            value={emailsSent ? `${replyRate}%` : "—"}
            hint={emailsSent ? "Across saved campaigns" : "No sends logged yet"}
          />
          <StatCard
            title="Active campaigns"
            value={String(campaigns.filter((c) => c.status === "active").length)}
          />
        </div>
      </section>
    </div>
  );
}
