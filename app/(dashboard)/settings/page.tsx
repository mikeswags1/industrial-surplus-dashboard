"use client";

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
            <code className="text-zinc-300">RESEND_API_KEY</code> +{" "}
            <code className="text-zinc-300">RESEND_FROM_EMAIL</code> — outbound sends (
            <code className="text-zinc-400">/api/send-email</code>)
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
          <code className="text-zinc-400">supabase/migrations/003_production_core.sql</code> in the Supabase SQL
          editor.
        </p>
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
