"use client";

import { useEffect, useState } from "react";

/** First name shown in the dashboard header — client workspace operator. */
const DISPLAY_NAME = "Jake";

function greetingPrefix(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting() {
  const [prefix, setPrefix] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setPrefix(greetingPrefix(new Date().getHours()));
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="m-0 shrink-0 text-right max-w-[min(100%,20rem)] ml-auto"
      role="status"
      aria-live="polite"
      aria-busy={prefix === null}
    >
      {prefix === null ? (
        <span className="inline-block h-16 sm:h-[4.5rem] w-full max-w-[14rem] animate-pulse rounded-xl bg-gradient-to-r from-white/[0.04] to-orange-500/[0.06]" />
      ) : (
        <div className="flex flex-col items-end gap-1 sm:gap-1.5 rounded-2xl border border-[rgba(242,92,5,0.2)] bg-gradient-to-br from-[rgba(242,92,5,0.12)] via-[rgba(15,16,20,0.5)] to-transparent px-4 py-3 sm:px-5 sm:py-4 shadow-[0_8px_40px_-16px_rgba(242,92,5,0.35)]">
          <span className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-[var(--color-heading)] drop-shadow-sm">
            {prefix},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent-muted)] via-orange-200 to-[var(--color-accent-hover)]">
              {DISPLAY_NAME}
            </span>
            <span className="inline-block ml-0.5 text-[var(--color-accent-muted)]" aria-hidden>
              ✨
            </span>
          </span>
          <p className="m-0 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-muted)] opacity-90">
            So glad you&apos;re here — you&apos;ve got this
          </p>
        </div>
      )}
    </div>
  );
}
