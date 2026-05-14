"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const BRAND = {
  name: "Select Surplus",
  tagline: "Industrial surplus acquisition",
};

const NAV_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview" },
      { href: "/lead-finder", label: "Lead Finder" },
      { href: "/leads", label: "Leads" },
      { href: "/send-emails", label: "Send emails" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/campaigns", label: "Campaigns" },
      { href: "/email", label: "Email studio" },
      { href: "/ads", label: "Ads" },
      { href: "/analytics", label: "Analytics" },
    ],
  },
  {
    label: "System",
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
        "group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-[var(--color-accent-dim)] text-[var(--color-heading)] shadow-[inset_0_0_0_1px_rgba(212,105,42,0.25)]"
          : "text-[var(--color-body-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-heading)]",
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
          active ? "bg-[var(--color-accent)]" : "bg-zinc-600 group-hover:bg-zinc-500"
        }`}
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
        className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-surface-1)] lg:shadow-[var(--shadow-sidebar)]"
      >
        <div className="flex h-full flex-col">
          <div className="p-5 lg:p-6 border-b border-[var(--color-border-subtle)]">
            <Link href="/" className="flex items-start gap-3 group">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#9a3d12] text-sm font-bold text-white shadow-lg shadow-orange-950/40 ring-1 ring-white/10"
                aria-hidden
              >
                SS
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold tracking-tight text-[var(--color-heading)] group-hover:text-white transition-colors">
                  {BRAND.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {BRAND.tagline}
                </span>
              </span>
            </Link>
          </div>

          <nav
            className="flex-1 overflow-x-auto lg:overflow-y-auto px-3 py-4 lg:px-4 lg:py-5"
            aria-label="Main navigation"
          >
            <div className="flex gap-2 lg:flex-col lg:gap-6 min-w-0">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="hidden lg:block px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {group.label}
                  </div>
                  <div className="flex flex-row gap-1 lg:flex-col">
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
            <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
              Outbound workspace — find prospects, send tracked mail, follow pipeline status.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-12 lg:py-10 xl:px-16">
          <div className="mx-auto max-w-[1200px] w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
