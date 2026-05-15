import Link from "next/link";

const FIRST_NAME = "Jake";

const STEPS = [
  {
    n: 1,
    title: "Find leads",
    body: "Search by area and industry, then approve companies you want in your list.",
    href: "/lead-finder",
    cta: "Find leads",
  },
  {
    n: 2,
    title: "Lead list",
    body: "Review saved prospects, update status, notes, or remove rows you don’t need.",
    href: "/leads",
    cta: "Open list",
  },
  {
    n: 3,
    title: "Send email",
    body: "Pick recipients, write or generate a message, send. Replies stay in your Gmail.",
    href: "/send-emails",
    cta: "Send email",
  },
  {
    n: 4,
    title: "Sent mail",
    body: "See who was emailed from here and any delivery issues (bounces, complaints).",
    href: "/email-tracking",
    cta: "View log",
  },
  {
    n: 5,
    title: "Settings",
    body: "Set your From domain (verified in Resend) and Reply-To where you read mail.",
    href: "/settings",
    cta: "Settings",
  },
] as const;

export default function HomePage() {
  return (
    <div className="w-full space-y-8 lg:space-y-10 pb-10">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-8 sm:px-10 sm:py-10 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-muted)]">
          Select Surplus LLC
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--color-heading)] tracking-tight">
          Hi {FIRST_NAME},
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-[17px] text-[var(--color-body-muted)] leading-relaxed">
          Work left to right: <strong className="text-[var(--color-heading)] font-semibold">find</strong> →{" "}
          <strong className="text-[var(--color-heading)] font-semibold">save</strong> →{" "}
          <strong className="text-[var(--color-heading)] font-semibold">email</strong> →{" "}
          <strong className="text-[var(--color-heading)] font-semibold">check sends</strong>. Each card opens the right screen;
          use the sidebar whenever you already know where you&apos;re headed.
        </p>
      </section>

      <section aria-labelledby="steps-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[var(--color-border-subtle)]">
          <h2 id="steps-heading" className="text-lg font-bold text-[var(--color-heading)] tracking-tight">
            Your workflow
          </h2>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            5 steps · do in order the first few times
          </span>
        </div>

        <ol className="mt-6 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-6">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.65)] transition-colors hover:border-[rgba(242,92,5,0.28)] min-h-[200px]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-bold text-white tabular-nums shadow-[0_2px_12px_-4px_rgba(242,92,5,0.55)]"
                  aria-hidden
                >
                  {step.n}
                </span>
                <h3 className="font-bold text-[var(--color-heading)] tracking-tight">{step.title}</h3>
              </div>
              <p className="mt-3 flex-1 text-sm text-[var(--color-body-muted)] leading-relaxed">{step.body}</p>
              <Link
                href={step.href}
                className="mt-5 dash-btn-secondary w-full justify-center py-2.5 text-sm font-semibold text-center border-[rgba(242,92,5,0.35)] hover:bg-[rgba(242,92,5,0.12)] hover:border-[rgba(242,92,5,0.45)]"
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
