"use client";

import { useLeads } from "@/context/leads-context";

export default function SettingsPage() {
  const { resetToMock } = useLeads();

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Environment checklist for moving from the local MVP to production.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-4 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Environment variables</h2>
        <ul className="space-y-2 text-zinc-400">
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code> — Supabase project URL
          </li>
          <li>
            <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — anon key for browser client
          </li>
          <li>
            <code className="text-zinc-300">OPENAI_API_KEY</code> — enables AI email / ad generation
          </li>
          <li>
            <code className="text-zinc-300">RESEND_API_KEY</code> — for transactional sends (wire in API routes next)
          </li>
        </ul>
        <p className="text-zinc-500 text-xs pt-2">
          Copy <code className="text-zinc-400">.env.example</code> to{" "}
          <code className="text-zinc-400">.env.local</code> and fill values.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-3 text-sm">
        <h2 className="text-sm font-medium text-zinc-300">Data (MVP)</h2>
        <p className="text-zinc-500">
          Leads and campaigns persist in <code className="text-zinc-400">localStorage</code>{" "}
          for fast UI iteration. Use &quot;Reset leads to sample data&quot; to restore the seed list.
        </p>
        <button
          type="button"
          onClick={resetToMock}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-zinc-200 hover:bg-[var(--color-surface-2)]"
        >
          Reset leads to sample data
        </button>
      </section>
    </div>
  );
}
