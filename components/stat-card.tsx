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
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[rgba(255,255,255,0.1)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {title}
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[var(--color-heading)]">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs text-[var(--color-body-muted)] leading-relaxed">{hint}</div>
      ) : null}
    </div>
  );
}
