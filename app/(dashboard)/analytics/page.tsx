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

export default function AnalyticsPage() {
  const { leads } = useLeads();
  const { campaigns } = useCampaigns();

  const emailsSent = campaigns.reduce((s, c) => s + c.emails_sent, 0);
  const replies = campaigns.reduce((s, c) => s + c.replies_count, 0);
  const interested = campaigns.reduce((s, c) => s + c.interested_count, 0);
  const replyRate =
    emailsSent > 0 ? Math.round((replies / emailsSent) * 1000) / 10 : 0;
  const interestRate =
    emailsSent > 0 ? Math.round((interested / emailsSent) * 1000) / 10 : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          Lightweight KPIs from the in-browser MVP store. Replace with Supabase
          aggregates and Resend webhooks when outbound is live.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total leads" value={String(leads.length)} />
        <StatCard title="Interested leads" value={String(countByStatus(leads, "Interested"))} />
        <StatCard title="Deals won" value={String(countByStatus(leads, "Deal Won"))} />
        <StatCard
          title="Pipeline value (open)"
          value={formatUsd(pipelineValue(leads))}
        />
        <StatCard title="Emails sent" value={String(emailsSent)} />
        <StatCard
          title="Reply rate"
          value={emailsSent ? `${replyRate}%` : "—"}
        />
        <StatCard
          title="Interested / sent"
          value={emailsSent ? `${interestRate}%` : "—"}
        />
        <StatCard
          title="Campaigns saved"
          value={String(campaigns.length)}
        />
      </div>

      <section className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)]/50 p-6 text-sm text-zinc-500">
        <p>
          Charting (funnels, cohorts, geo heatmaps) is intentionally deferred.
          The next step is persisting events from Resend and ad platforms into
          Supabase, then charting with your preferred library.
        </p>
      </section>
    </div>
  );
}
