"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const BRAND_NAME = "Select Surplus LLC";

/** Core pages only — avoids crowding for day-to-day use. Draft tools stay at /email and /ads if needed. */
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/lead-finder", label: "Find leads" },
  { href: "/leads", label: "Leads" },
  { href: "/send-emails", label: "Send email" },
  { href: "/email-tracking", label: "Sent mail" },
  { href: "/settings", label: "Settings" },
];

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium tracking-tight transition-colors min-h-[44px]",
        active
          ? "bg-[var(--color-accent)] text-white"
          : "text-[var(--color-body-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-heading)]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-surface-0)]">
      <aside className="w-full lg:w-56 xl:w-[15rem] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="flex h-full flex-col">
          <div className="p-4 lg:p-5 border-b border-[var(--color-border-subtle)]">
            <Link
              href="/"
              className="block font-semibold text-[var(--color-heading)] tracking-tight text-[15px] outline-none rounded focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              {BRAND_NAME}
            </Link>
          </div>

          <nav
            className="flex-1 overflow-x-auto lg:overflow-y-auto px-2 py-3 lg:px-3 lg:py-4"
            aria-label="Main navigation"
          >
            <ul className="flex flex-row gap-0.5 lg:flex-col lg:gap-0.5">
              {NAV_LINKS.map((item) => (
                <li key={item.href} className="shrink-0 lg:shrink">
                  <NavLink
                    href={item.href}
                    label={item.label}
                    active={isActive(pathname, item.href)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] px-4 py-3 sm:px-6 lg:px-10">
          <p className="text-sm text-[var(--color-body-muted)]">
            {pathname === "/"
              ? "Choose a step below — or jump anywhere from the menu on the left."
              : "Manage your lead list and outbound email."}
          </p>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1280px] w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
