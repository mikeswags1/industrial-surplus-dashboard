"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dash-card";
import { PageHeader } from "@/components/page-header";
import type { Lead, LeadStatus } from "@/lib/types";
import { useLeads } from "@/context/leads-context";

function hasValidEmail(lead: Lead): boolean {
  const e = lead.email?.trim() ?? "";
  return Boolean(e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

type OutreachLog = {
  id: string;
  lead_id: string | null;
  event_type: string;
  subject: string | null;
  to_email: string | null;
  from_email: string | null;
  created_at: string;
  body_preview: string | null;
};

export default function EmailTrackingPage() {
  const { leads, dataSource } = useLeads();
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [runtime, setRuntime] = useState<{
    resendWebhook: string;
    dataLayer: string;
  } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch("/api/outreach-logs?limit=100", { cache: "no-store" });
      const json = (await res.json()) as { logs?: OutreachLog[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load activity");
      setLogs(Array.isArray(json.logs) ? json.logs : []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    void fetch("/api/config/runtime", { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json()) as {
          resendWebhook?: string;
          dataLayer?: string;
        };
        setRuntime({
          resendWebhook: j.resendWebhook ?? "?",
          dataLayer: j.dataLayer ?? "?",
        });
      })
      .catch(() =>
        setRuntime({ resendWebhook: "unknown", dataLayer: "unknown" }),
      );
  }, []);

  const mailableLeads = useMemo(() => leads.filter(hasValidEmail), [leads]);

  const funnel = useMemo(() => {
    let neverSent = 0;
    let emailed = 0;
    let terminalPipeline = 0;

    const terminal: LeadStatus[] = ["Deal Won", "Not Interested"];

    for (const lead of mailableLeads) {
      const hasSend = Boolean(lead.last_email_sent_at?.trim());

      if (!hasSend) {
        neverSent += 1;
        continue;
      }

      emailed += 1;

      if (terminal.includes(lead.status)) {
        terminalPipeline += 1;
      }
    }

    return { neverSent, emailed, terminalPipeline };
  }, [mailableLeads]);

  const recentSends = useMemo(() => logs.filter((l) => l.event_type === "send").slice(0, 35), [logs]);

  const deliveryIssues = useMemo(
    () => logs.filter((l) => l.event_type === "bounce" || l.event_type === "complaint").slice(0, 25),
    [logs],
  );

  const webhookOk = runtime?.resendWebhook === "ok";

  const siteUrlHint =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/api/webhooks/resend`
      : "/api/webhooks/resend";

  return (
    <div className="space-y-10 max-w-6xl">
      <PageHeader
        title="Email tracking"
        description={(
          <>
            Who has been emailed and when — sourced from {" "}
            <code className="text-[var(--color-body)]">outreach_logs</code>. Bounces / complaints appear when{" "}
            <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code> is set and Resend sends those events here.{" "}
            <Link href="/send-emails" className="dash-link">
              Send emails
            </Link>
            {" · "}
            <Link href="/leads" className="dash-link">
              Lead list
            </Link>
            {" · "}
            <Link href="/settings#outbound-sender" className="dash-link">
              Outbound sender
            </Link>
          </>
        )}
      />

      <DashCard className="p-6 space-y-4 text-sm text-[var(--color-body-muted)]">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Resend + webhooks (sends &amp; delivery)
        </h2>
        <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
          <li>
            Domain + <code className="text-[var(--color-body)]">RESEND_API_KEY</code> →{" "}
            <Link href="/settings#outbound-sender" className="dash-link font-semibold">
              Settings → Outbound sender
            </Link>
            .
          </li>
          <li>
            Add{" "}
            <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code> from Resend Webhooks → endpoint{" "}
            <code className="text-[var(--color-body)] break-all">{siteUrlHint}</code> → subscribe{" "}
            <code className="text-[var(--color-body)]">email.bounced</code> and{" "}
            <code className="text-[var(--color-body)]">email.complained</code>
            {!webhookOk ? (
              <>
                {" "}
                (<span className="text-amber-400 font-semibold">secret missing</span>)
              </>
            ) : null}
            .
          </li>
        </ol>
        <p className="text-xs pt-1">
          Backend:{" "}
          <span className="text-[var(--color-heading)] font-semibold">
            {runtime ? runtime.dataLayer : "…"}
          </span>
          . Webhook secret:{" "}
          <span className={`font-semibold ${webhookOk ? "text-emerald-400" : "text-amber-400"}`}>
            {runtime?.resendWebhook ?? "checking…"}
          </span>
          {webhookOk ? null : (
            <span className="text-[var(--color-muted)]">
              {" "}
              — Needed for bounce/complaint rows below.
            </span>
          )}
        </p>
      </DashCard>

      {dataSource !== "remote" ? (
        <p className="text-sm text-amber-400/95">Connect Supabase to load live lead totals and send history.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard className="p-5 ring-2 ring-[var(--color-accent)]/20">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Not emailed yet</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.neverSent}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Mailable leads with no outbound send logged.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Emailed (≥ once)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.emailed}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">At least one send in outreach history.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Won / not interested</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.terminalPipeline}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Mailable leads emailed and marked terminal in pipeline.</p>
        </DashCard>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-[var(--color-heading)]">Recent outbound sends</h2>
          <button
            type="button"
            className="text-xs text-[var(--color-accent)] font-semibold hover:underline"
            onClick={() => void loadLogs()}
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">To</th>
                <th className="pb-2 font-medium">Subject / preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {recentSends.map((row) => (
                <tr key={row.id} className="text-[var(--color-body-muted)]">
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{row.to_email ?? "—"}</td>
                  <td className="py-2 max-w-[360px] truncate">{row.subject ?? row.body_preview ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadErr ? (
            <p className="text-sm text-red-400 py-4" role="alert">
              {loadErr}
            </p>
          ) : null}
          {!recentSends.length && !loadErr ? (
            <p className="text-[var(--color-muted)] text-sm py-6">Nothing sent yet.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-[var(--color-heading)]">Delivery issues (bounce / complaint)</h2>
          {!webhookOk ? (
            <span className="text-xs font-semibold text-amber-500">Set webhook secret to capture</span>
          ) : null}
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 font-medium">To / detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {deliveryIssues.map((row) => (
                <tr key={row.id} className="text-[var(--color-body-muted)]">
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-medium text-rose-400/95">{row.event_type}</td>
                  <td className="py-2 max-w-[440px] truncate">
                    {row.to_email ?? "—"} · {row.subject ?? row.body_preview ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deliveryIssues.length ? (
            <p className="text-[var(--color-muted)] text-sm py-6">
              No bounce or complaint logged yet — or webhook not wired. Resend “delivered” events are not stored here unless
              you extend the webhook handler later.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
