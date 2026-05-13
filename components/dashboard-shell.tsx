"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/leads", label: "Leads" },
  { href: "/lead-finder", label: "Lead Finder" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/email", label: "Email Generator" },
  { href: "/ads", label: "Ad Scripts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-surface-0)]">
      <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="p-4 md:p-5 border-b border-[var(--color-border)]">
          <div className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Surplus Ops
          </div>
          <div className="font-semibold text-zinc-100 mt-1">
            Marketing Dashboard
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-visible">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[var(--color-surface-2)] text-white border border-[var(--color-border)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
