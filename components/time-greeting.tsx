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
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setLine(`${greetingPrefix(new Date().getHours())}, ${DISPLAY_NAME}`);
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p
      className="m-0 text-right leading-snug shrink-0 max-w-[220px] sm:max-w-none"
      role="status"
      aria-live="polite"
      aria-busy={line === null}
    >
      {line === null ? (
        <span className="inline-block h-[1.75rem] sm:h-8 min-w-[12rem] animate-pulse rounded-md bg-white/[0.06]" />
      ) : (
        <span className="text-[15px] sm:text-lg font-bold tracking-tight text-[var(--color-heading)]">
          {line}
        </span>
      )}
    </p>
  );
}
