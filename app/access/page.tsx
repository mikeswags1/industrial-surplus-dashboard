import { Suspense } from "react";
import { AccessForm } from "./access-form";

export const dynamic = "force-dynamic";

export default function AccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface-0)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-8 shadow-[var(--shadow-card)] sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-muted)]">
          Select Surplus LLC
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[var(--color-heading)] tracking-tight">
          Enter access code
        </h1>
        <p className="mt-3 text-sm text-[var(--color-body-muted)] leading-relaxed">
          This dashboard is private. Enter the access code you were given (for example Jake’s PIN). If you already
          unlocked this browser, you won’t see this screen again until you clear site data or use{" "}
          <span className="text-[var(--color-heading)] font-medium">Settings → Require access code again</span>.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}
          >
            <AccessForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
