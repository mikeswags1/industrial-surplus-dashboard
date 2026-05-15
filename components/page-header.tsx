import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Tighter bottom margin when nested in a stack */
  compact?: boolean;
};

export function PageHeader({ title, description, children, compact }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between ${
        compact ? "pb-6 mb-6" : "pb-8 mb-8"
      } border-b border-[var(--color-border-subtle)]`}
    >
      <div className="space-y-2 min-w-0 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-heading)] leading-[1.12]">
          {title}
        </h1>
        {description ? (
          <div className="text-base text-[var(--color-body-muted)] leading-relaxed max-w-3xl font-medium">
            {description}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
      ) : null}
    </div>
  );
}
