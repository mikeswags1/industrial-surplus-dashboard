"use client";

import { useLeads } from "@/context/leads-context";
import { useCampaigns } from "@/context/campaigns-context";

export default function SettingsPage() {
  const { resetToMock, dataSource: leadsMode, refresh: refreshLeads } = useLeads();
  const { dataSource: campMode, refresh: refreshCamp } = useCampaigns();

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Environment checklist and data mode for the outbound platform.
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
          <code className="text-zinc-400">supabase/schema.sql</code> then{" "}
          <code className="text-zinc-400">supabase/migrations/002_outbound_platform.sql</code>{" "}
          in the Supabase SQL editor.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-3 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Data mode</h2>
        <p className="text-zinc-500">
          Leads: <span className="text-zinc-300">{leadsMode}</span> · Campaigns:{" "}
          <span className="text-zinc-300">{campMode}</span>
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
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-3 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Local browser store</h2>
        <p className="text-zinc-500">
          When Supabase is not configured, leads are stored in{" "}
          <code className="text-zinc-400">localStorage</code> only. This clears that
          copy (does not delete rows in Supabase).
        </p>
        <button
          type="button"
          onClick={resetToMock}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-zinc-200 hover:bg-[var(--color-surface-2)]"
        >
          Clear local leads
        </button>
      </section>
    </div>
  );
}
