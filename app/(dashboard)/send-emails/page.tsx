"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dash-card";
import { PageHeader } from "@/components/page-header";
import { useLeads } from "@/context/leads-context";

type OutreachLog = {
  id: string;
  lead_id: string | null;
  event_type: string;
  subject: string | null;
  to_email: string | null;
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

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/outreach-logs?limit=30", { cache: "no-store" });
    const json = (await res.json()) as { logs?: OutreachLog[] };
    setLogs(Array.isArray(json.logs) ? json.logs : []);
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

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllMailable() {
    setSelected(new Set(withEmail.map((l) => l.id)));
  }

  async function generateFromSelection() {
    const ids = Array.from(selected);
    const seed = ids.length ? leads.find((l) => l.id === ids[0]) : withEmail[0];
    if (!seed) {
      setError("Select at least one lead with an email.");
      return;
    }
    setGenLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: seed.target_industry || seed.industry || "Industrial services",
          equipment_type: seed.equipment_type || "Industrial equipment",
          state: seed.state,
          company_name: seed.company_name,
          pain_point:
            "Excess motors, scrap, surplus gear, warehouse cleanouts after upgrades.",
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
      const html = plainBodyToHtml(body);
      const res = await fetch("/api/send-email/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: ids,
          subject: subject.trim(),
          body,
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
      setResultMsg(
        `Sent: ${r.sent ?? 0}, not sent (errors / skipped already): ${r.failed ?? 0}${
          skippedAlready ? ` (${skippedAlready} skipped — duplicate send blocked)` : ""
        }.`,
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
        title="Send emails"
        description={(
          <>
            Choose saved leads from the{" "}
            <Link href="/leads" className="dash-link">
              Leads
            </Link>{" "}
            list (valid emails only), edit the draft, then send in batches. Sends and manual reply marks
            go to <code className="text-[var(--color-body)]">outreach_logs</code>. Add a Resend webhook at{" "}
            <code className="text-[var(--color-body)]">/api/webhooks/resend</code> with{" "}
            <code className="text-[var(--color-body)]">RESEND_WEBHOOK_SECRET</code> for inbound detection.
            Set the visible From in{" "}
            <Link href="/settings#outbound-sender" className="dash-link">
              Settings → Outbound sender
            </Link>
            . Duplicate sends require confirmation.
          </>
        )}
      />

      {dataSource !== "remote" ? (
        <p className="text-sm text-amber-400/95">Connect Supabase to send tracked emails.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">
              Select leads ({withEmail.length} with email)
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
            {withEmail.map((l) => (
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
                  {l.last_email_sent_at ? (
                    <span className="block text-xs text-amber-500 mt-0.5">Previously emailed</span>
                  ) : null}
                </span>
              </label>
            ))}
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
              disabled={genLoading || withEmail.length === 0}
              onClick={() => void generateFromSelection()}
              className="rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              {genLoading ? "Generating…" : "Generate draft"}
            </button>
          </div>
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
          <p className="text-xs text-zinc-600">
            Needs a Resend{" "}
            <code className="text-zinc-400">RESEND_API_KEY</code>. Your &quot;from&quot; address comes from{" "}
            <strong className="text-zinc-500">Settings → Outbound sender</strong>, or fallback{" "}
            <code className="text-zinc-400">RESEND_FROM_EMAIL</code>. Caps:{" "}
            <code className="text-zinc-400">OUTBOUND_MAX_SENDS_PER_HOUR</code>.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-zinc-300">Recent email activity</h2>
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
            <p className="text-zinc-500 text-sm py-4">No sends logged yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
