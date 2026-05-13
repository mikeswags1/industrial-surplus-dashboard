export function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-zinc-500">{hint}</div>
      ) : null}
    </div>
  );
}
