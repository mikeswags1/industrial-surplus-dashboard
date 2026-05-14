"use client";

import { StatCard } from "@/components/stat-card";
import { useLeads, countByStatus, pipelineValue } from "@/context/leads-context";
import { useCampaigns } from "@/context/campaigns-context";
import {
  aggregateIndustry,
  aggregateLeadsByState,
} from "@/lib/analytics/from-leads";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-10 text-right tabular-nums text-zinc-500">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 text-right tabular-nums text-zinc-300">{value}</div>
    </div>
  );
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

  const byState = aggregateLeadsByState(leads).slice(0, 12);
  const maxState = byState[0]?.count ?? 0;
  const byIndustry = aggregateIndustry(leads);
  const maxInd = byIndustry[0]?.count ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          KPIs from leads and campaigns. Outbound email totals will align with
          Outbound email totals will align with{" "}
          <code className="text-zinc-400">outreach_logs</code> once workers drain
          the send queue.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Leads by state</h2>
          {byState.length === 0 ? (
            <p className="text-sm text-zinc-500">No leads yet.</p>
          ) : (
            <div className="space-y-2">
              {byState.map((r) => (
                <BarRow key={r.state} label={r.state} value={r.count} max={maxState} />
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Top industries</h2>
          <p className="text-xs text-zinc-600">
            Uses enriched <code className="text-zinc-500">industry_detected</code> when
            present, else manual industry field.
          </p>
          {byIndustry.length === 0 ? (
            <p className="text-sm text-zinc-500">No industry data yet.</p>
          ) : (
            <div className="space-y-2">
              {byIndustry.map((r, i) => (
                <BarRow
                  key={`${r.label}-${i}`}
                  label={r.label.slice(0, 14)}
                  value={r.count}
                  max={maxInd}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
