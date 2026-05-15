"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TimeGreeting } from "@/components/time-greeting";

const BRAND = {
  line1: "Select Surplus",
  line2: "LLC",
  tagline: "Industrial surplus — leads & outbound",
};

const NAV_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Overview" },
      { href: "/lead-finder", label: "Find leads" },
      { href: "/leads", label: "Lead list" },
      { href: "/send-emails", label: "Send emails" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/campaigns", label: "Campaigns" },
      { href: "/email", label: "Email copy" },
      { href: "/ads", label: "Ads" },
      { href: "/analytics", label: "Analytics" },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/settings", label: "Settings" }],
  },
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
        "group flex items-center gap-3 rounded-lg px-3.5 py-3 text-[15px] font-semibold tracking-tight transition-all duration-150 min-h-[46px]",
        active
          ? "bg-[var(--color-accent)] text-white shadow-[0_4px_20px_-6px_rgba(242,92,5,0.65)] ring-1 ring-white/15"
          : "text-[var(--color-body-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-heading)] active:scale-[0.99]",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 shrink-0 rounded-full transition-colors ring-2 ring-transparent",
          active ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-zinc-600 group-hover:bg-[var(--color-accent-muted)]",
        ].join(" ")}
        aria-hidden
      />
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
      <aside
        className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-surface-1)] lg:shadow-[var(--shadow-sidebar)]"
      >
        <div className="flex h-full flex-col">
          <div className="p-5 lg:p-6 border-b border-[var(--color-border-subtle)]">
            <Link href="/" className="flex items-center gap-3.5 group outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)]">
              <span
                className="h-[2.875rem] w-1.5 shrink-0 rounded-sm bg-[var(--color-accent)] shadow-[0_0_26px_-2px_rgba(242,92,5,0.55)] group-hover:shadow-[0_0_32px_-2px_rgba(242,92,5,0.72)] transition-shadow"
                aria-hidden
              />
              <span className="min-w-0 text-left">
                <span className="block font-bold tracking-tight text-[17px] text-[var(--color-heading)] leading-[1.2]">
                  {BRAND.line1}{" "}
                  <span className="text-[var(--color-body-muted)] font-semibold text-[13px] sm:text-[14px]">{BRAND.line2}</span>
                </span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {BRAND.tagline}
                </span>
              </span>
            </Link>
          </div>

          <nav
            className="flex-1 overflow-x-auto lg:overflow-y-auto px-3 py-4 lg:px-4 lg:py-6"
            aria-label="Main navigation"
          >
            <div className="flex gap-2 lg:flex-col lg:gap-8 min-w-0">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="hidden lg:block px-3.5 mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {group.label}
                  </div>
                  <div className="flex flex-row gap-1 lg:flex-col lg:gap-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        active={isActive(pathname, item.href)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="hidden lg:block p-5 border-t border-[var(--color-border-subtle)] mt-auto">
            <p className="text-[12px] font-medium leading-relaxed text-[var(--color-body-muted)]">
              <strong className="text-[var(--color-heading)] font-bold">Pick one tab at a time.</strong> Orange buttons are “go”; outline buttons are helpers.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]/92 backdrop-blur-md px-4 py-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-muted)]">
              Workspace
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-body-muted)] max-w-xl">
              Follow the steps in order, or jump anywhere from the menu.
            </p>
          </div>
          <TimeGreeting />
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-12 lg:py-10 xl:px-16">
          <div className="mx-auto max-w-[1200px] w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
