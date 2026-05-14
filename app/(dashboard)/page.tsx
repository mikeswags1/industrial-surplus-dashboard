import Link from "next/link";
import { DashCard } from "@/components/dash-card";

const STEPS = [
  {
    n: "01",
    title: "Discover prospects",
    body: "Run Lead Finder with your territories and industry presets. Results come from live Google Places data — nothing synthetic lands in your CRM.",
    href: "/lead-finder",
    cta: "Open Lead Finder",
  },
  {
    n: "02",
    title: "Build your pipeline",
    body: "Approve the best fits or add an entire preview batch. Duplicate websites and firms are skipped so your list stays clean.",
    href: "/leads",
    cta: "View Leads",
  },
  {
    n: "03",
    title: "Outreach that scales",
    body: "Generate drafts, refine the message, and send tracked batches from your verified sender. Resend requires explicit confirmation before duplicate sends.",
    href: "/send-emails",
    cta: "Send emails",
  },
  {
    n: "04",
    title: "Track every touch",
    body: "Email status, last sent, replies, and pipeline stage live on one table — plus webhooks for inbound mail when configured.",
    href: "/leads",
    cta: "Leads & status",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12 lg:space-y-16">
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-10 sm:px-10 sm:py-12 shadow-[var(--shadow-card)]">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-[0.07] blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-hover)]">
          Workflow
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-heading)] leading-[1.15]">
          From territory search to signed deal — in one workspace.
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--color-body-muted)] leading-relaxed">
          Use the sidebar to move through each stage. Everything persists in your database; configure
          API keys and sending identity under Settings when you go live.
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">Recommended path</h2>
            <p className="mt-1 text-sm text-[var(--color-body-muted)]">
              Four steps most teams run in order — you can jump ahead anytime.
            </p>
          </div>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n}>
              <DashCard className="p-6 h-full flex flex-col transition-colors hover:border-[rgba(212,105,42,0.25)]">
                <span className="text-[11px] font-semibold tabular-nums text-[var(--color-muted)]">
                  {s.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-[var(--color-heading)]">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-[var(--color-body-muted)] leading-relaxed">
                  {s.body}
                </p>
                <Link href={s.href} className="dash-link mt-5 inline-flex items-center gap-1 w-fit">
                  {s.cta}
                  <span aria-hidden>→</span>
                </Link>
              </DashCard>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <DashCard className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Campaigns
          </div>
          <p className="mt-2 text-sm text-[var(--color-body-muted)] leading-relaxed">
            Queue sequenced sends and let the worker drip follow-ups on a schedule.
          </p>
          <Link href="/campaigns" className="dash-link mt-4 inline-block">
            Campaigns →
          </Link>
        </DashCard>
        <DashCard className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Creative
          </div>
          <p className="mt-2 text-sm text-[var(--color-body-muted)] leading-relaxed">
            Draft emails and ad angles with templates tuned for surplus buyers.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/email" className="dash-link">
              Email studio
            </Link>
            <Link href="/ads" className="dash-link">
              Ads
            </Link>
          </div>
        </DashCard>
        <DashCard className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Analytics
          </div>
          <p className="mt-2 text-sm text-[var(--color-body-muted)] leading-relaxed">
            Reply rates and send volume from your logs — as your data grows, charts fill in.
          </p>
          <Link href="/analytics" className="dash-link mt-4 inline-block">
            Open analytics →
          </Link>
        </DashCard>
      </section>
    </div>
  );
}
