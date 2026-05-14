"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">How this dashboard works</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Four simple steps — no fluff. Everything else is tucked under Settings until you need
          it.
        </p>
      </header>
      <ol className="space-y-6 text-sm">
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="font-medium text-zinc-200 mb-1">1. Find companies</div>
          <p className="text-zinc-500 mb-3">
            Use Lead Finder with state, city, target industry preset, and equipment focus. Results
            are real Google Places listings — nothing fake gets saved.
          </p>
          <Link
            href="/lead-finder"
            className="text-[var(--color-accent)] text-sm hover:underline"
          >
            Open Lead Finder →
          </Link>
        </li>
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="font-medium text-zinc-200 mb-1">2. Save as leads</div>
          <p className="text-zinc-500 mb-3">
            Approve the best hits one-by-one or use{" "}
            <span className="text-zinc-400">Add all</span> to save everyone still in preview.
            Duplicates are skipped automatically when the CRM already has the same website or firm.
          </p>
          <Link href="/leads" className="text-[var(--color-accent)] text-sm hover:underline">
            View saved leads →
          </Link>
        </li>
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="font-medium text-zinc-200 mb-1">3. Send cold emails</div>
          <p className="text-zinc-500 mb-3">
            Pick leads with verified emails, generate a starter message, edit it, and send tracked
            batches. Resending needs an explicit confirmation.
          </p>
          <Link
            href="/send-emails"
            className="text-[var(--color-accent)] text-sm hover:underline"
          >
            Send emails →
          </Link>
        </li>
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <div className="font-medium text-zinc-200 mb-1">4. Track replies</div>
          <p className="text-zinc-500 mb-3">
            The Leads table shows email activity from your send logs: sent, waiting, no-response
            days, replies, pipeline status, and deals won. Bulk actions help you tidy the list fast.
          </p>
          <Link href="/leads" className="text-[var(--color-accent)] text-sm hover:underline">
            Back to Leads →
          </Link>
        </li>
      </ol>
    </div>
  );
}
