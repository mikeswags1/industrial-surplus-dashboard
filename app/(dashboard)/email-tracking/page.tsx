"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dash-card";
import { PageHeader } from "@/components/page-header";
import type { Lead, LeadStatus } from "@/lib/types";
import { useLeads } from "@/context/leads-context";
import { dashboardFetch } from "@/lib/dashboard-fetch";

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
      const res = await dashboardFetch("/api/outreach-logs?limit=100", { cache: "no-store" });
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
    void dashboardFetch("/api/config/runtime", { cache: "no-store" })
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
        title="Who you&apos;ve emailed"
        description={
          <>
            A simple log of <strong className="text-[var(--color-heading)] font-semibold">outbound mail</strong> sent from
            this tool (see counts and tables below). Replies to those messages still live in Gmail — this page is not your
            inbox.
            {" "}
            <Link href="/send-emails" className="dash-link">
              Send mail
            </Link>
            {" · "}
            <Link href="/leads" className="dash-link">
              Lead list
            </Link>
            {" · "}
            <Link href="/settings#outbound-sender" className="dash-link">
              Who mail sends as
            </Link>
          </>
        }
      />

      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40 px-4 py-3 text-sm text-[var(--color-body-muted)] leading-relaxed">
        The <strong className="text-[var(--color-heading)] font-semibold">bottom table</strong> only fills in when bounce / spam complaint
        webhooks are set up (see developer section below). Missing webhooks doesn&apos;t mean mail failed silently — it usually
        means this dashboard never received the error event from Resend.
      </div>

      <details className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-body-muted)]">
        <summary className="cursor-pointer list-none font-medium text-[var(--color-heading)] flex items-center justify-between gap-2">
          Developer — bounce &amp; complaint webhooks (Resend)
          <span className="text-xs font-normal text-[var(--color-muted)] group-open:hidden">Show</span>
          <span className="hidden text-xs font-normal text-[var(--color-muted)] group-open:inline">Hide</span>
        </summary>
        <div className="mt-4 space-y-3 border-t border-[var(--color-border-subtle)] pt-4 leading-relaxed">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Sending domain +{" "}
              <code className="text-[var(--color-body)]">RESEND_API_KEY</code> — save in{" "}
              <Link href="/settings#outbound-sender" className="dash-link font-semibold">
                Sending email identity in Settings
              </Link>
              .
            </li>
            <li>
              In Resend, add webhook URL{" "}
              <code className="text-[var(--color-body)] break-all">{siteUrlHint}</code>
              {" with "}
              <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code>
              {" in this app — subscribe "}
              <code className="text-[var(--color-body)]">email.bounced</code> &amp;{" "}
              <code className="text-[var(--color-body)]">email.complained</code>
              {!webhookOk ? (
                <span className="text-amber-400 font-semibold"> {" "}(secret missing)</span>
              ) : null}
              .
            </li>
          </ol>
          <p className="text-xs">
            Connection:{" "}
            <span className="text-[var(--color-heading)] font-semibold">
              {runtime ? runtime.dataLayer : "…"}
            </span>
            . Webhook:{" "}
            <span className={`font-semibold ${webhookOk ? "text-emerald-400" : "text-amber-400"}`}>
              {runtime?.resendWebhook ?? "…"}
            </span>
            {!webhookOk ? (
              <span className="text-[var(--color-muted)]"> — required for bounce / complaint rows below.</span>
            ) : null}
          </p>
        </div>
      </details>

      {dataSource !== "remote" ? (
        <p className="text-sm text-amber-400/95">Connect the database (Supabase env) to load leads and sends.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard className="p-5 ring-2 ring-[var(--color-accent)]/20">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Not emailed yet</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.neverSent}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Has an email address, but nothing sent yet from here.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Emailed (≥ once)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.emailed}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">At least one message sent through this dashboard.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Won / not interested</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.terminalPipeline}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">People you emailed who are marked Won or Not interested.</p>
        </DashCard>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-[var(--color-heading)]">Recent sends from this tool</h2>
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
          <h2 className="text-sm font-medium text-[var(--color-heading)]">Problems (bounces &amp; spam complaints)</h2>
          {!webhookOk ? (
            <span className="text-xs font-semibold text-amber-500">Needs webhook setup to list rows</span>
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
            <div className="text-[var(--color-muted)] text-sm py-6 space-y-2 leading-relaxed">
              <p>Nothing logged here yet — either deliveries are healthy, or webhook events aren&apos;t connected.</p>
              {!webhookOk ? (
                <p className="text-xs text-[var(--color-body-muted)]">
                  Expand <strong className="text-[var(--color-heading)]">&quot;Developer — bounce &amp; complaint webhooks&quot;</strong>{" "}
                  above for setup steps (Resend dashboard +{' '}
                  <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code>).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
