"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashCard } from "@/components/dash-card";
import { PageHeader } from "@/components/page-header";
import { useLeads } from "@/context/leads-context";
import { isBlockedResendFromDomain } from "@/lib/email/resend-from-validation";

function modeLabel(m: string) {
  if (m === "remote") return "connected";
  if (m === "unconfigured") return "not configured";
  if (m === "error") return "error";
  return m;
}

export default function SettingsPage() {
  const { dataSource: leadsMode, backendMessage: leadsErr, refresh: refreshLeads } =
    useLeads();

  const [inboxDisplay, setInboxDisplay] = useState("");
  const [inboxFrom, setInboxFrom] = useState("");
  const [inboxReplyTo, setInboxReplyTo] = useState("");
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxSaving, setInboxSaving] = useState(false);
  const [inboxErr, setInboxErr] = useState<string | null>(null);
  const [inboxOk, setInboxOk] = useState<string | null>(null);

  const consumerFromWarning = useMemo(() => isBlockedResendFromDomain(inboxFrom), [inboxFrom]);

  useEffect(() => {
    if (leadsMode !== "remote") return;
    setInboxLoading(true);
    setInboxErr(null);
    void fetch("/api/inboxes", { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json()) as {
          inboxes?: { from_email: string; reply_to_email: string | null; display_name: string }[];
          error?: string;
        };
        if (!r.ok) throw new Error(j.error ?? "Could not load inbox");
        const row = j.inboxes?.[0];
        if (row) {
          setInboxFrom(row.from_email);
          setInboxReplyTo(row.reply_to_email?.trim() ?? "");
          setInboxDisplay(row.display_name ?? "");
        }
      })
      .catch((e) => setInboxErr(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setInboxLoading(false));
  }, [leadsMode]);

  async function saveInbox(e: FormEvent) {
    e.preventDefault();
    setInboxSaving(true);
    setInboxErr(null);
    setInboxOk(null);
    try {
      const res = await fetch("/api/inboxes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: inboxDisplay.trim() || "Outbound",
          fromEmail: inboxFrom.trim(),
          replyToEmail: inboxReplyTo.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      setInboxOk("Saved. New sends use this address (domain must stay verified in Resend).");
    } catch (e) {
      setInboxErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setInboxSaving(false);
    }
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Sender address and connection status. Advanced env list is below if you need it."
      />

      <details className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-4 sm:p-5 text-sm">
        <summary className="cursor-pointer list-none font-semibold text-[var(--color-heading)] flex items-center justify-between gap-2">
          Environment variables
          <span className="text-xs font-normal text-[var(--color-muted)] group-open:hidden">Show</span>
          <span className="hidden text-xs font-normal text-[var(--color-muted)] group-open:inline">Hide</span>
        </summary>
        <ul className="mt-4 space-y-2 text-[var(--color-body-muted)] border-t border-[var(--color-border-subtle)] pt-4">
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code> — project URL
          </li>
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — anon key (browser)
          </li>
          <li>
            <code className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY</code> —{" "}
            <span className="text-zinc-500">server only</span>; powers API routes for leads/import/outreach logs
          </li>
          <li>
            <code className="text-zinc-300">OPENAI_API_KEY</code> — AI email / ad copy
          </li>
          <li>
            <code className="text-zinc-300">GOOGLE_PLACES_API_KEY</code> —{" "}
            <span className="text-zinc-500">server only</span>; powers real Lead Finder provider search
          </li>
          <li>
            <code className="text-zinc-300">RESEND_API_KEY</code> — required to send mail. Your default
            &quot;from&quot; address is stored in Settings below or via{" "}
            <code className="text-zinc-300">RESEND_FROM_EMAIL</code> if no inbox row exists.
          </li>
          <li>
            <code className="text-zinc-300">OUTBOUND_MAX_SENDS_PER_HOUR</code> — optional cap (default 100)
          </li>
        </ul>
        <p className="text-[var(--color-body-muted)] text-xs mt-4 leading-relaxed">
          Copy <code className="text-[var(--color-body)]">.env.example</code> to{" "}
          <code className="text-[var(--color-body)]">.env.local</code> and fill values. Run migrations from{" "}
          <code className="text-[var(--color-body)]">supabase/migrations</code> in the SQL editor when needed.
        </p>
      </details>

      <DashCard id="outbound-sender" className="p-6 space-y-4 text-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Outbound sender
          </h2>
          <p className="mt-2 text-xs text-[var(--color-body-muted)] leading-relaxed">
            <strong className="text-[var(--color-heading)]">From</strong> must be an address at a domain you verify in{" "}
            <a className="dash-link" href="https://resend.com/domains" target="_blank" rel="noreferrer">
              Resend
            </a>
            . Use <strong className="text-[var(--color-heading)]">Reply-To</strong> for the inbox where you actually read mail (often Gmail).
          </p>
        </div>

        {leadsMode !== "remote" ? (
          <p className="text-xs text-[var(--color-muted)]">Connect Supabase to edit the sending identity.</p>
        ) : inboxLoading ? (
          <p className="text-[var(--color-body-muted)] text-xs">Loading…</p>
        ) : (
          <form onSubmit={saveInbox} className="space-y-4 max-w-lg">
            {consumerFromWarning ? (
              <p
                className="rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2.5 text-xs text-amber-100/95 leading-relaxed"
                role="status"
              >
                This From line looks like consumer mail (@gmail, @yahoo, etc.). Resend won&apos;t send from that — use an
                address at{" "}
                <Link href="https://resend.com/domains" className="underline underline-offset-2">
                  your verified domain
                </Link>
                , and put your personal Gmail in Reply-To if you read mail there.
              </p>
            ) : null}
            <label className="flex flex-col gap-2">
              <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">Display label (internal)</span>
              <input
                className="dash-input font-sans"
                value={inboxDisplay}
                onChange={(e) => setInboxDisplay(e.target.value)}
                placeholder="Client brand name"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">
                From (Resend) <span className="text-red-400/90">*</span>
              </span>
              <input
                required
                className="dash-input font-mono text-[13px]"
                value={inboxFrom}
                onChange={(e) => setInboxFrom(e.target.value)}
                placeholder="Jake Mitchell &lt;jake@your-verified-domain.com&gt;"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="dash-label normal-case tracking-normal text-[var(--color-body-muted)]">Reply-To (optional)</span>
              <span className="text-[11px] text-[var(--color-muted)] leading-snug">
                Optional. This app records outbound sends and delivery signals from Resend — not your inbound mailbox. Use
                Reply-To for whatever address you actually read (often Gmail).
              </span>
              <input
                className="dash-input font-mono text-[13px]"
                value={inboxReplyTo}
                onChange={(e) => setInboxReplyTo(e.target.value)}
                placeholder="jakemitchellselect@gmail.com"
              />
            </label>
            {inboxErr ? <p className="text-xs text-red-400">{inboxErr}</p> : null}
            {inboxOk ? <p className="text-xs text-emerald-400/90">{inboxOk}</p> : null}
            <button
              type="submit"
              disabled={inboxSaving || !inboxFrom.trim()}
              className="dash-btn-primary disabled:opacity-50"
            >
              {inboxSaving ? "Saving…" : "Save sender"}
            </button>
          </form>
        )}
      </DashCard>

      <details className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] flex items-center justify-between gap-2">
          Avatar in inbox (optional)
          <span className="normal-case font-normal text-[var(--color-muted)] group-open:hidden text-[11px]">Show</span>
          <span className="hidden normal-case font-normal text-[var(--color-muted)] group-open:inline text-[11px]">Hide</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm text-[var(--color-body-muted)] border-t border-[var(--color-border-subtle)] pt-4 leading-relaxed">
          <p>
            Inboxes pick the portrait; this app doesn&apos;t upload one. Common free option: upload a photo to{" "}
            <a className="dash-link font-semibold" href="https://gravatar.com" target="_blank" rel="noreferrer">
              Gravatar
            </a>{" "}
            tied to your <strong className="text-[var(--color-heading)]">exact From email</strong>.
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            BIMI / branded logos for large brands are heavier — skip for day-to-day.
          </p>
        </div>
      </details>

      <DashCard className="p-6 space-y-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Backend status</h2>
        <p className="text-[var(--color-body-muted)]">
          Leads API: <span className="text-[var(--color-heading)]">{modeLabel(leadsMode)}</span>
          {leadsErr && leadsMode !== "remote" ? (
            <span className="block mt-1 text-xs text-[var(--color-muted)]">{leadsErr}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshLeads()}
            className="dash-btn-secondary"
          >
            Refresh leads
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Lead data stays in Supabase when the backend is configured.
        </p>
      </DashCard>
    </div>
  );
}
