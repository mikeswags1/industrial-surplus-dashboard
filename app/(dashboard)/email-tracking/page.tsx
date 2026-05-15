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
    let sentAwaitingReply = 0;
    let repliedBucket = 0;
    let otherStatuses = 0;

    const terminal: LeadStatus[] = ["Deal Won", "Not Interested"];

    for (const lead of mailableLeads) {
      const hasSend = Boolean(lead.last_email_sent_at?.trim());
      const hasReply =
        Boolean(lead.reply_logged_at?.trim()) ||
        lead.status === "Replied" ||
        (lead.inbound_reply_count ?? 0) > 0;

      if (hasReply) {
        repliedBucket += 1;
        continue;
      }

      if (!hasSend) {
        neverSent += 1;
        continue;
      }

      if (terminal.includes(lead.status)) {
        otherStatuses += 1;
        continue;
      }

      sentAwaitingReply += 1;
    }

    return { neverSent, sentAwaitingReply, repliedBucket, otherStatuses };
  }, [mailableLeads]);

  const recentSends = useMemo(() => logs.filter((l) => l.event_type === "send").slice(0, 35), [logs]);

  const recentReplies = useMemo(
    () => logs.filter((l) => l.event_type === "reply").slice(0, 20),
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
            Counts mirror your leads list plus everything logged in{" "}
            <code className="text-[var(--color-body)]">outreach_logs</code>. Sends are tracked when mail goes out;
            replies need Resend inbound + a signed webhook pointing at this app.{" "}
            <Link href="/send-emails" className="dash-link">
              Send emails
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
          Link your client&apos;s outbound email &amp; track replies
        </h2>
        <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
          <li>
            In{" "}
            <a className="dash-link" href="https://resend.com/domains" target="_blank" rel="noreferrer">
              Resend → Domains
            </a>
            , add and verify DNS for the domain you&apos;ll send from (
            <code className="text-[var(--color-body)]">SPF/DKIM</code> complete).
          </li>
          <li>
            In this app →{" "}
            <Link href="/settings#outbound-sender" className="dash-link font-semibold">
              Settings → Outbound sender
            </Link>
            , save the <strong className="text-[var(--color-heading)]">From</strong> address on that verified domain — e.g.{" "}
            <code className="text-[var(--color-body)]">Jake Mitchell &lt;jake@your-business-domain.com&gt;</code>.
            Gmail addresses like{" "}
            <code className="text-[var(--color-body)]">jakemitchellselect@gmail.com</code> cannot be the authenticated
            From with Resend. You may put Gmail in Reply-To so Jake reads replies there — note that replies then bypass
            Resend, so you won&apos;t get automatic webhook &quot;replied&quot; rows unless leads reply to your verified-domain
            address instead.
          </li>
          <li>
            In Vercel (or hosting), set{" "}
            <code className="text-[var(--color-body)]">RESEND_API_KEY</code> (required). For automatic reply logging,
            set <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code> too.
          </li>
          <li>
            In Resend → Webhooks → add endpoint URL{" "}
            <code className="text-[var(--color-body)] break-all">{siteUrlHint}</code> and subscribe at least to{" "}
            <code className="text-[var(--color-body)]">email.received</code>,{" "}
            <code className="text-[var(--color-body)]">email.bounced</code>, and{" "}
            <code className="text-[var(--color-body)]">email.complained</code>. Paste the Svix signing secret into{" "}
            <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code>.
          </li>
          <li>
            For <strong className="text-[var(--color-heading)]">inbound replies</strong> (so Prospects emailing you back hit
            this webhook), configure Resend{" "}
            <a
              className="dash-link"
              href="https://resend.com/docs/dashboard/receiving/introduction"
              target="_blank"
              rel="noreferrer"
            >
              Receiving
            </a>{" "}
            (MX/subdomain forwarding) so messages to your sending alias are handled by Resend and forwarded to your
            endpoint.
          </li>
        </ol>
        <p className="text-xs pt-1">
          Backend:{" "}
          <span className="text-[var(--color-heading)] font-semibold">
            {runtime ? runtime.dataLayer : "…"}
          </span>
          . Webhook signing secret configured:{" "}
          <span className={`font-semibold ${webhookOk ? "text-emerald-400" : "text-amber-400"}`}>
            {runtime?.resendWebhook ?? "checking…"}
          </span>
          {webhookOk ? null : (
            <span className="text-[var(--color-muted)]">
              {" "}
              — Reply logging needs Resend inbound + webhook configured.
            </span>
          )}
        </p>
      </DashCard>

      {dataSource !== "remote" ? (
        <p className="text-sm text-amber-400/95">Connect Supabase to load live lead totals and inbox history.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Haven&apos;t emailed</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.neverSent}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Leads with a valid email, no send logged.</p>
        </DashCard>
        <DashCard className="p-5 ring-2 ring-[var(--color-accent)]/20">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Emailed, no reply yet</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.sentAwaitingReply}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Includes pending &quot;No response&quot; aging on the leads list.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Replied</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-400">{funnel.repliedBucket}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">Matched webhook or logged reply timestamps.</p>
        </DashCard>
        <DashCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Terminal pipeline</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-heading)]">{funnel.otherStatuses}</p>
          <p className="mt-2 text-xs text-[var(--color-body-muted)]">
            Emailed but status is Won / Not interested (excluding simple reply bucket).
          </p>
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
          <h2 className="text-sm font-medium text-[var(--color-heading)]">New replies (logged)</h2>
          {!webhookOk ? (
            <span className="text-xs font-semibold text-amber-500">Configure webhook to populate</span>
          ) : null}
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">From prospect</th>
                <th className="pb-2 pr-3 font-medium">Captured as</th>
                <th className="pb-2 font-medium">Subject / snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {recentReplies.map((row) => (
                <tr key={row.id} className="text-[var(--color-body-muted)]">
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{row.from_email ?? row.to_email ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs">
                    {row.lead_id ? (
                      <Link href="/leads" className="dash-link">
                        Matched lead
                      </Link>
                    ) : (
                      <span className="text-amber-500/90">Unmatched sender</span>
                    )}
                  </td>
                  <td className="py-2 max-w-[340px] truncate">{row.subject ?? row.body_preview ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentReplies.length ? (
            <p className="text-[var(--color-muted)] text-sm py-6">
              No webhook replies logged yet — they appear here once Resend inbound delivers and signs an{" "}
              <code className="text-[var(--color-body)]">email.received</code> event.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
