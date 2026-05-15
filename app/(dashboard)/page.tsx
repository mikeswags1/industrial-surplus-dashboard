import Link from "next/link";
import { DashCard } from "@/components/dash-card";

const STEPS = [
  {
    n: "1",
    title: "Find companies",
    body: "Search by territory and trade. Results come from Google Places — nothing fake gets saved.",
    href: "/lead-finder",
    cta: "Open finder",
  },
  {
    n: "2",
    title: "Save leads",
    body: "Approve the rows you want. Duplicates drop out automatically.",
    href: "/leads",
    cta: "View leads",
  },
  {
    n: "3",
    title: "Email them",
    body: "Write once or generate drafts. Sends only fire after you confirm.",
    href: "/send-emails",
    cta: "Send emails",
  },
  {
    n: "4",
    title: "Watch replies",
    body: "Sent, failed, and replies show on your lead list when webhooks are set up.",
    href: "/leads",
    cta: "Open lead list",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12 lg:space-y-14">
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-10 sm:px-10 sm:py-12 shadow-[var(--shadow-card)]">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-accent)] opacity-[0.08] blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-accent-muted)]">
          Start here
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-heading)] leading-[1.12]">
          Your pipeline in four big steps.
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--color-body-muted)] leading-relaxed font-medium">
          Use the sidebar on the left — each page is one job. Big orange buttons mean “do the main thing.”
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-heading)] tracking-tight">
            Do this in order (or skip ahead)
          </h2>
          <p className="mt-2 text-sm font-medium text-[var(--color-body-muted)] max-w-2xl">
            Tap a step. You can always come back — your data is stored in Supabase.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n}>
              <DashCard className="p-6 sm:p-7 h-full flex flex-col transition-colors hover:border-[rgba(242,92,5,0.35)]">
                <span className="text-xs font-bold tabular-nums text-[var(--color-accent-muted)]">
                  Step {s.n}
                </span>
                <h3 className="mt-2 text-lg sm:text-xl font-bold text-[var(--color-heading)] tracking-tight">{s.title}</h3>
                <p className="mt-3 flex-1 text-sm sm:text-base text-[var(--color-body-muted)] leading-relaxed font-medium">
                  {s.body}
                </p>
                <Link href={s.href} className="dash-btn-primary mt-6 w-fit sm:min-h-[48px] px-6">
                  {s.cta}
                </Link>
              </DashCard>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <DashCard className="p-5 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Campaigns
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--color-body-muted)] leading-relaxed">
            Scheduled follow-ups and batch sends.
          </p>
          <Link href="/campaigns" className="dash-btn-primary mt-5 w-full justify-center sm:w-auto inline-flex">
            Campaigns
          </Link>
        </DashCard>
        <DashCard className="p-5 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Writing
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--color-body-muted)] leading-relaxed">
            Email drafts and ad ideas for surplus outreach.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/email" className="dash-btn-secondary justify-center inline-flex flex-1 min-w-[8rem]">
              Email copy
            </Link>
            <Link href="/ads" className="dash-btn-secondary justify-center inline-flex flex-1 min-w-[8rem]">
              Ads
            </Link>
          </div>
        </DashCard>
        <DashCard className="p-5 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Analytics
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--color-body-muted)] leading-relaxed">
            Sends and replies as your history grows.
          </p>
          <Link href="/analytics" className="dash-btn-primary mt-5 w-full justify-center sm:w-auto inline-flex">
            Analytics
          </Link>
        </DashCard>
      </section>
    </div>
  );
}
