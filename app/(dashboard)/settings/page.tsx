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
        description="Environment checklist, outbound sender identity, and backend connectivity for this workspace."
      />

      <DashCard className="p-6 space-y-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Environment variables
        </h2>
        <ul className="space-y-2 text-[var(--color-body-muted)]">
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
        <p className="text-[var(--color-body-muted)] text-xs pt-2 leading-relaxed">
          Copy <code className="text-[var(--color-body)]">.env.example</code> to{" "}
          <code className="text-[var(--color-body)]">.env.local</code> and fill values. Run migrations in
          order in the Supabase SQL editor (see repo <code className="text-[var(--color-body)]">supabase/migrations</code>
          ).
        </p>
      </DashCard>

      <DashCard id="outbound-sender" className="p-6 space-y-4 text-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Outbound sender
          </h2>
          <p className="mt-2 text-xs text-[var(--color-body-muted)] leading-relaxed">
            Stored in Supabase <code className="text-[var(--color-body)]">inboxes</code>. The visible{" "}
            <strong className="text-[var(--color-heading)]">From</strong> must use an address at a domain you verify in{" "}
            <a
              className="dash-link"
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
            >
              Resend
            </a>{" "}
            (consumer mail like{" "}
            <code className="text-[var(--color-body)]">@gmail.com</code> cannot be authenticated as From). Jake can still{" "}
            <strong className="text-[var(--color-heading)]">receive</strong> replies in Gmail: use{" "}
            <code className="text-[var(--color-body)]">jakemitchellselect@gmail.com</code> in{" "}
            <strong className="text-[var(--color-heading)]">Reply-To</strong> below, while From stays something like{" "}
            <code className="text-[var(--color-body)]">Jake Mitchell &lt;jake@select-surplus-domain.com&gt;</code>.
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
                This From line looks like consumer mail (@gmail, @yahoo, etc.). Resend will reject sends — switch to an
                address on{" "}
                <Link href="https://resend.com/domains" className="underline underline-offset-2">
                  your verified domain
                </Link>
                , and put <code className="text-[11px]">jakemitchellselect@gmail.com</code> in Reply-To if Jake reads
                mail there.
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
                If prospects reply to Gmail here, replies never pass through Resend, so automatic &quot;replied&quot; tracking from
                the webhook will not fire. For hands-off dashboard tracking, use Receiving on your verified domain instead
                and keep Reply-To on that domain (or leave Reply-To blank).
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

      <DashCard className="p-6 space-y-3 text-sm text-[var(--color-body-muted)]">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Photo / logo next to your emails (Gmail &amp; others)
        </h2>
        <p className="leading-relaxed">
          This app can&apos;t upload an “avatar image” to Resend for you — the inbox (Gmail, Outlook, etc.) decides what
          shows. For addresses like <code className="text-[var(--color-body)]">jake@selectsurplususa.com</code>, the usual
          free approach is{" "}
          <a className="dash-link font-semibold" href="https://gravatar.com" target="_blank" rel="noreferrer">
            Gravatar
          </a>
          : create an account with the <strong className="text-[var(--color-heading)]">exact same From email</strong> and upload Jake&apos;s photo there. Some clients show it;
          Gmail also factors Google account history.
        </p>
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          A branded logo in the inbox list for large senders often uses{" "}
          <a className="dash-link" href="https://bimigroup.org/" target="_blank" rel="noreferrer">
            BIMI
          </a>{" "}
          (DMARC + a verified mark certificate) — heavier setup, not required for day‑one testing.
        </p>
      </DashCard>

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
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          Production mode does not persist leads in the browser. All data lives in Supabase once the service role and
          migrations are in place.
        </p>
      </DashCard>
    </div>
  );
}
