import Link from "next/link";

const QUICK_LINKS = [
  { href: "/lead-finder", label: "Find leads" },
  { href: "/leads", label: "Lead list" },
  { href: "/send-emails", label: "Send email" },
  { href: "/email-tracking", label: "Activity" },
  { href: "/settings", label: "Settings" },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-heading)] tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--color-body-muted)] leading-relaxed">
          Look up companies, save them as leads, send email when you&apos;re ready, and see who has been contacted.
        </p>
      </div>

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
    </div>
  );
}
