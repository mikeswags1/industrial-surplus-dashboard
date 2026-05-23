"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useLeads } from "@/context/leads-context";
import type { Lead } from "@/lib/types";
import {
  BROADCAST_RECIPIENT_THRESHOLD,
  deriveBatchGenerationInputs,
  type BatchSpecificityMode,
} from "@/lib/email/batch-email-generation";
import { dashboardFetch } from "@/lib/dashboard-fetch";

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

function plainBodyToHtml(text: string) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p).trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/** Appended when “Include website link at end” is on. */
const OUTBOUND_WEBSITE_FOOTER_URL = "https://www.selectsurplususa.com/";

function appendWebsiteFooter(
  plainBody: string,
  enabled: boolean
): { body: string; html: string } {
  if (!enabled) {
    return { body: plainBody, html: plainBodyToHtml(plainBody) };
  }
  const url = OUTBOUND_WEBSITE_FOOTER_URL.trim();
  const body = `${plainBody.replace(/\s+$/, "")}\n\n${url}`;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const footerHtml = `<p style="margin-top:12px;line-height:1.5;font-size:14px"><a href="${escAttr(url)}" rel="noopener noreferrer">${esc(url)}</a></p>`;
  return {
    body,
    html: plainBodyToHtml(plainBody) + footerHtml,
  };
}

/** Pain-point text fed into AI / template when generating drafts from selection. */
const GENERATION_PAIN_POINT =
  "Excess motors, scrap, surplus gear, warehouse cleanouts after upgrades.";

function specificityHint(mode: BatchSpecificityMode, n: number): string {
  switch (mode) {
    case "broadcast":
      return `${n} recipients — using a broad email that fits everyone at once (${BROADCAST_RECIPIENT_THRESHOLD}+ recipients always does this). No company names.`;
    case "shared_niche":
      return `${n} recipients — same equipment focus and area on every row; the draft can be more specific to that niche (still no individual company names).`;
    case "mixed_small":
      return `${n} recipients — mixed trades or geography in this batch; wording stays moderately general so it still reads OK for everyone.`;
    default:
      return `One recipient — a tighter, more personalized draft is OK when it fits.`;
  }
}

export default function SendEmailsPage() {
  const { leads, refresh, dataSource } = useLeads();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [includeWebsiteLink, setIncludeWebsiteLink] = useState(true);

  const loadLogs = useCallback(async () => {
    const res = await dashboardFetch("/api/outreach-logs?limit=30", { cache: "no-store" });
    const json = (await res.json()) as { logs?: OutreachLog[] };
    const rows = Array.isArray(json.logs) ? json.logs : [];
    // Outbound-focused UI: hide optional inbound audit rows from the dashboard.
    setLogs(rows.filter((l) => l.event_type !== "reply"));
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const withEmail = useMemo(
    () =>
      leads.filter(
        (l) => l.email?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim())
      ),
    [leads]
  );
  const availableToEmail = useMemo(
    () => withEmail.filter((l) => !l.last_email_sent_at),
    [withEmail],
  );

  useEffect(() => {
    const availableIds = new Set(availableToEmail.map((l) => l.id));
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => availableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [availableToEmail]);

  const generationFromSelection = useMemo(() => {
    const ids = Array.from(selected);
    if (ids.length > 0) {
      const sel = ids
        .map((id) => leads.find((l) => l.id === id))
        .filter((l): l is Lead => Boolean(l));
      return deriveBatchGenerationInputs(sel, GENERATION_PAIN_POINT);
    }
    const fallback = availableToEmail[0];
    if (!fallback) return null;
    return deriveBatchGenerationInputs([fallback], GENERATION_PAIN_POINT);
  }, [selected, leads, availableToEmail]);

  function toggle(id: string) {
    if (!availableToEmail.some((l) => l.id === id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllMailable() {
    setSelected(new Set(availableToEmail.map((l) => l.id)));
  }

  async function generateFromSelection() {
    const ids = Array.from(selected);
    const selectedLeads =
      ids.length > 0
        ? ids.map((id) => leads.find((l) => l.id === id)).filter((l): l is Lead => Boolean(l))
        : [];
    const seeds = selectedLeads.length > 0 ? selectedLeads : availableToEmail.slice(0, 1);
    const inputs = deriveBatchGenerationInputs(seeds, GENERATION_PAIN_POINT);
    if (!inputs) {
      setError("Select at least one lead with an email.");
      return;
    }
    setGenLoading(true);
    setError(null);
    try {
      const res = await dashboardFetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputs,
          include_followups: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Generate failed");
      setSubject(typeof data.subject === "string" ? data.subject : "");
      setBody(typeof data.body === "string" ? data.body : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenLoading(false);
    }
  }

  async function sendBatch(allowResend: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) {
      setError("Select leads to email.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Add a subject and message body.");
      return;
    }

    if (allowResend) {
      const ok = confirm("Send email again even if these leads already have a logged send?");
      if (!ok) return;
    }

    setSending(true);
    setError(null);
    setResultMsg(null);

    try {
      const { body: bodyOut, html } = appendWebsiteFooter(body, includeWebsiteLink);
      const res = await dashboardFetch("/api/send-email/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: ids,
          subject: subject.trim(),
          body: bodyOut,
          html,
          allowResend,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error((data as { error?: string }).error ?? "Batch send failed");
      const r = data as {
        sent?: number;
        failed?: number;
        results?: { leadId: string; ok: boolean; error?: string; skipped?: string }[];
      };
      const skippedAlready = (r.results ?? []).filter((x) => x.skipped === "already_sent").length;
      const failures = (r.results ?? []).filter((x) => !x.ok);
      const detailParts = failures.map((x) => {
        const lead = leads.find((l) => l.id === x.leadId);
        const label = lead?.company_name?.trim() || lead?.email || x.leadId.slice(0, 8);
        if (x.skipped === "already_sent") {
          return `${label}: blocked as duplicate (click “Force resend selected” if you really want another send)`;
        }
        return `${label}: ${x.error ?? "failed"}`;
      });
      const detail =
        detailParts.length > 0
          ? ` ${detailParts.join(" · ")}`
          : skippedAlready > 0
            ? ` (${skippedAlready} blocked — already emailed)`
            : "";
      setResultMsg(
        `Sent: ${r.sent ?? 0}, not sent: ${r.failed ?? 0}.${detail}`,
      );
      await refresh();
      await loadLogs();
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const selectedNeedsResendConfirm = Array.from(selected).some((id) => {
    const l = leads.find((x) => x.id === id);
    return Boolean(l?.last_email_sent_at);
  });

  return (
    <div className="space-y-10 max-w-6xl">
      <PageHeader
        title="Send email"
        description={
          <>
            Pick leads below, compose a message, then send.
            {" "}
            <Link href="/leads" className="dash-link">
              Lead list
            </Link>
            {" · "}
            <Link href="/email-tracking" className="dash-link">
              Sent mail
            </Link>
            {" · "}
            <Link href="/settings#outbound-sender" className="dash-link">
              Sender settings
            </Link>
          </>
        }
      />

      {dataSource !== "remote" ? (
        <p className="text-sm text-amber-400/95">Add database env vars to enable sending.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">
              Select leads ({availableToEmail.length} available, {withEmail.length} with email)
            </h2>
            <button
              type="button"
              className="text-xs text-[var(--color-accent)] hover:underline"
              onClick={selectAllMailable}
            >
              Select all mailable
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-[var(--color-border)] text-sm">
            {availableToEmail.map((l) => (
              <label
                key={l.id}
                className="flex items-start gap-2 py-2 cursor-pointer hover:bg-[var(--color-surface-2)]/40 px-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                />
                <span>
                  <span className="text-zinc-200">{l.company_name}</span>
                  <span className="block text-xs text-zinc-500">{l.email}</span>
                </span>
              </label>
            ))}
            {withEmail.length > 0 && availableToEmail.length === 0 ? (
              <p className="px-2 py-4 text-xs text-zinc-500">
                All valid-email leads have already been emailed. Add or find new leads to send another batch.
              </p>
            ) : null}
          </div>
          {withEmail.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No leads with valid emails. Add emails on the Leads page or approve Lead Finder rows
              that include scraped addresses.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={genLoading || availableToEmail.length === 0}
              onClick={() => void generateFromSelection()}
              className="rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              {genLoading ? "Generating…" : "Generate draft"}
            </button>
          </div>
          {generationFromSelection ? (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/50 px-3 py-2.5 text-xs text-[var(--color-body-muted)] leading-relaxed">
              <span className="font-semibold text-[var(--color-heading)]">Draft mode: </span>
              {specificityHint(generationFromSelection.specificity_mode, generationFromSelection.recipient_count)}{" "}
              {generationFromSelection.selection_notes ? (
                <span className="block mt-1 text-[var(--color-muted)]">{generationFromSelection.selection_notes}</span>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-600 leading-snug">
              Pick recipients for accurate draft mode — or leave none selected and Generate uses your first mailable lead only.
              Large batches ({BROADCAST_RECIPIENT_THRESHOLD}+) get broad copy; a few leads in the same niche can be tighter.
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Subject</span>
            <input
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about surplus inventory…"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Message (plain text)</span>
            <textarea
              rows={14}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 font-sans text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi…"
            />
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={includeWebsiteLink}
              onClick={() => setIncludeWebsiteLink((v) => !v)}
              className={[
                "w-fit rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                includeWebsiteLink
                  ? "border-[rgba(242,92,5,0.55)] bg-[rgba(242,92,5,0.12)] text-zinc-100"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              <span className="block">{includeWebsiteLink ? "✓ Include website link at end" : "Include website link at end"}</span>
              <span className="mt-1 block text-[11px] font-normal text-zinc-500 break-all">{OUTBOUND_WEBSITE_FOOTER_URL}</span>
            </button>
            <p className="text-[11px] text-zinc-600 leading-snug max-w-xl">
              When this is on, the link above is appended after your message when you send (plaintext + HTML email).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending || selected.size === 0}
              onClick={() => void sendBatch(false)}
              className="dash-btn-primary disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send (${selected.size})`}
            </button>
            {selectedNeedsResendConfirm ? (
              <button
                type="button"
                disabled={sending || selected.size === 0}
                onClick={() => {
                  const ok = confirm(
                    "Some selected leads already received an email. Send again anyway?",
                  );
                  if (!ok) return;
                  void sendBatch(true);
                }}
                className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-2 text-sm text-amber-100 disabled:opacity-50"
              >
                Force resend selected
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {resultMsg ? <p className="text-sm text-emerald-400">{resultMsg}</p> : null}
          <p className="text-xs text-zinc-500">
            Mail is sent through Resend using the address in{" "}
            <Link href="/settings#outbound-sender" className="text-zinc-400 hover:underline">
              Settings
            </Link>
            .
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-zinc-300">Recent outbound &amp; delivery events</h2>
          <button
            type="button"
            className="text-xs text-[var(--color-accent)] hover:underline"
            onClick={() => void loadLogs()}
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase text-zinc-500 border-b border-[var(--color-border)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">To</th>
                <th className="pb-2 font-medium">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {logs.map((row) => (
                <tr key={row.id} className="text-zinc-400">
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{row.event_type}</td>
                  <td className="py-2 pr-3">{row.to_email ?? "—"}</td>
                  <td className="py-2 max-w-[240px] truncate">{row.subject ?? row.body_preview ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length ? (
            <p className="text-zinc-500 text-sm py-4">No outbound or delivery events logged yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
