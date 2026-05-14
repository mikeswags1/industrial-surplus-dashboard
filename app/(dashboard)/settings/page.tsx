"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useLeads } from "@/context/leads-context";
import { useCampaigns } from "@/context/campaigns-context";

function modeLabel(m: string) {
  if (m === "remote") return "connected";
  if (m === "unconfigured") return "not configured";
  if (m === "error") return "error";
  return m;
}

export default function SettingsPage() {
  const { dataSource: leadsMode, backendMessage: leadsErr, refresh: refreshLeads } =
    useLeads();
  const { dataSource: campMode, backendMessage: campErr, refresh: refreshCamp } =
    useCampaigns();

  const [inboxDisplay, setInboxDisplay] = useState("");
  const [inboxFrom, setInboxFrom] = useState("");
  const [inboxReplyTo, setInboxReplyTo] = useState("");
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxSaving, setInboxSaving] = useState(false);
  const [inboxErr, setInboxErr] = useState<string | null>(null);
  const [inboxOk, setInboxOk] = useState<string | null>(null);

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
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Environment checklist and backend connectivity for the outbound platform.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Environment variables</h2>
        <ul className="space-y-2 text-zinc-400">
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code> — project URL
          </li>
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — anon key (browser)
          </li>
          <li>
            <code className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY</code> —{" "}
            <span className="text-zinc-500">server only</span>; powers API routes for leads/campaigns/import
          </li>
          <li>
            <code className="text-zinc-300">OPENAI_API_KEY</code> — AI email / ad copy
          </li>
          <li>
            <code className="text-zinc-300">GOOGLE_PLACES_API_KEY</code> —{" "}
            <span className="text-zinc-500">server only</span>; powers real Lead Finder provider search
          </li>
          <li>
            <code className="text-zinc-300">RESEND_API_KEY</code> +{" "}
            <code className="text-zinc-300">RESEND_FROM_EMAIL</code> — required API key;{" "}
            <span className="text-zinc-500">
              from address fallback when no row exists in <code className="text-zinc-400">inboxes</code>
            </span>{" "}
            (<Link href="#outbound-sender" className="text-[var(--color-accent)] hover:underline">
              configure below
            </Link>
            )
          </li>
          <li>
            <code className="text-zinc-300">OUTBOUND_MAX_SENDS_PER_HOUR</code> — optional cap (default 100)
          </li>
        </ul>
        <p className="text-zinc-500 text-xs pt-2">
          Copy <code className="text-zinc-400">.env.example</code> to{" "}
          <code className="text-zinc-400">.env.local</code> and fill values. Run{" "}
          <code className="text-zinc-400">supabase/schema.sql</code>, then{" "}
          <code className="text-zinc-400">supabase/migrations/002_outbound_platform.sql</code>, then{" "}
          <code className="text-zinc-400">supabase/migrations/003_production_core.sql</code>, then{" "}
          <code className="text-zinc-400">supabase/migrations/004_lead_finder.sql</code>, then{" "}
          <code className="text-zinc-400">supabase/migrations/005_lead_finder_buy_side.sql</code>, then{" "}
          <code className="text-zinc-400">supabase/migrations/006_leads_target_assets.sql</code> in the Supabase SQL editor.
        </p>
      </section>

      <section
        id="outbound-sender"
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4 text-sm"
      >
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Outbound sender (client email)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Stored in Supabase <code className="text-zinc-400">inboxes</code>. Must match an address
            or domain you have verified in{" "}
            <a
              className="text-[var(--color-accent)] hover:underline"
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
            >
              Resend
            </a>
            . Leads use their workspace <code className="text-zinc-500">organization_id</code> to pick
            the right identity; this form edits the default workspace.
          </p>
        </div>

        {leadsMode !== "remote" ? (
          <p className="text-xs text-zinc-600">Connect Supabase to edit the sending identity.</p>
        ) : inboxLoading ? (
          <p className="text-zinc-500 text-xs">Loading…</p>
        ) : (
          <form onSubmit={saveInbox} className="space-y-3 max-w-lg">
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">Display label (internal)</span>
              <input
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm"
                value={inboxDisplay}
                onChange={(e) => setInboxDisplay(e.target.value)}
                placeholder="Client brand name"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">
                From (Resend) <span className="text-red-400/90">*</span>
              </span>
              <input
                required
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm font-mono text-xs"
                value={inboxFrom}
                onChange={(e) => setInboxFrom(e.target.value)}
                placeholder="Acme Sales &lt;sales@verified-client-domain.com&gt;"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">Reply-To (optional)</span>
              <input
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2 text-sm font-mono text-xs"
                value={inboxReplyTo}
                onChange={(e) => setInboxReplyTo(e.target.value)}
                placeholder="inbox@client.com"
              />
            </label>
            {inboxErr ? <p className="text-xs text-red-400">{inboxErr}</p> : null}
            {inboxOk ? <p className="text-xs text-emerald-400/90">{inboxOk}</p> : null}
            <button
              type="submit"
              disabled={inboxSaving || !inboxFrom.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-muted)] disabled:opacity-50"
            >
              {inboxSaving ? "Saving…" : "Save sender"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-3 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Backend status</h2>
        <p className="text-zinc-500">
          Leads API: <span className="text-zinc-300">{modeLabel(leadsMode)}</span>
          {leadsErr && leadsMode !== "remote" ? (
            <span className="block mt-1 text-xs text-zinc-600">{leadsErr}</span>
          ) : null}
        </p>
        <p className="text-zinc-500">
          Campaigns API: <span className="text-zinc-300">{modeLabel(campMode)}</span>
          {campErr && campMode !== "remote" ? (
            <span className="block mt-1 text-xs text-zinc-600">{campErr}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshLeads()}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-zinc-200 hover:bg-[var(--color-surface-2)]"
          >
            Refresh leads
          </button>
          <button
            type="button"
            onClick={() => void refreshCamp()}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-zinc-200 hover:bg-[var(--color-surface-2)]"
          >
            Refresh campaigns
          </button>
        </div>
        <p className="text-xs text-zinc-600">
          Production mode does not persist leads or campaigns in the browser. All data lives in
          Supabase once the service role and migrations are in place.
        </p>
      </section>
    </div>
  );
}
