import type { ComponentProps } from "react";

export function DashCard({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] ${className}`}
      {...props}
    />
  );
}
