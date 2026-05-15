import Link from "next/link";

const FIRST_NAME = "Jake";

const HOW_TO_STEPS = [
  {
    n: 1,
    title: "Find leads",
    body: "Pick state, city, and industries, then search. You’ll get real businesses — approve the ones you want to keep.",
    href: "/lead-finder",
    cta: "Open Find leads",
  },
  {
    n: 2,
    title: "Lead list",
    body: "Every approved company shows up here. Add notes, fix pipeline status, or delete rows you don’t need.",
    href: "/leads",
    cta: "Open Lead list",
  },
  {
    n: 3,
    title: "Send email",
    body: "Select people with valid emails, edit the message (or generate a draft), then send. Replies go to your Gmail — not this app.",
    href: "/send-emails",
    cta: "Open Send email",
  },
  {
    n: 4,
    title: "Sent mail",
    body: "See who’s been emailed from this tool and any bounces. For conversations, use your inbox.",
    href: "/email-tracking",
    cta: "Open Sent mail",
  },
  {
    n: 5,
    title: "Settings",
    body: "Set the name and address mail is sent from (your business domain) and where replies should go (often your Gmail).",
    href: "/settings",
    cta: "Open Settings",
  },
] as const;

const QUICK_LINKS = [
  { href: "/lead-finder", label: "Find leads" },
  { href: "/leads", label: "Lead list" },
  { href: "/send-emails", label: "Send email" },
  { href: "/email-tracking", label: "Sent mail" },
  { href: "/settings", label: "Settings" },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-10 max-w-2xl">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-muted)]">
          Select Surplus LLC
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-heading)] tracking-tight leading-tight">
          Hi {FIRST_NAME},
        </h1>
        <p className="text-base text-[var(--color-body-muted)] leading-relaxed max-w-xl">
          This workspace is for one flow: <strong className="text-[var(--color-heading)] font-semibold">find</strong> prospects,{" "}
          <strong className="text-[var(--color-heading)] font-semibold">save</strong> them,{" "}
          <strong className="text-[var(--color-heading)] font-semibold">email</strong> them, then check who was contacted. Follow
          the steps below in order, or use the menu on the left anytime.
        </p>
      </header>

      <section
        aria-labelledby="how-to-heading"
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] px-5 py-6 sm:px-7 sm:py-7"
      >
        <h2
          id="how-to-heading"
          className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]"
        >
          How to use this
        </h2>
        <ol className="mt-6 space-y-6 list-none">
          {HOW_TO_STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white tabular-nums"
                aria-hidden
              >
                {step.n}
              </span>
              <div className="min-w-0 pt-0.5 space-y-2">
                <h3 className="text-base font-bold text-[var(--color-heading)] tracking-tight">{step.title}</h3>
                <p className="text-sm text-[var(--color-body-muted)] leading-relaxed">{step.body}</p>
                <Link href={step.href} className="dash-link text-sm font-semibold inline-block">
                  {step.cta} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="shortcuts-heading" className="space-y-3">
        <h2 id="shortcuts-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Quick buttons
        </h2>
        <p className="text-sm text-[var(--color-body-muted)]">Same pages as above — handy if you already know where you&apos;re going.</p>
        <nav aria-label="Quick links">
          <ul className="grid gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="dash-btn-primary w-full justify-center text-center py-3 text-sm font-medium inline-flex"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </div>
  );
}
