import { DashboardShell } from "@/components/dashboard-shell";
import { LeadsProvider } from "@/context/leads-context";
import type { ReactNode } from "react";

/** Ensures HTML is not served as a stale static shell without running middleware on each request. */
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LeadsProvider>
      <DashboardShell>{children}</DashboardShell>
    </LeadsProvider>
  );
}
