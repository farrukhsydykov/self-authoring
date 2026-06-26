import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: ReactNode;
}

/** Consistent page title block with optional metadata and actions. */
export function PageHeader({ title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
        )}
        {meta && <p className="mt-2 text-xs text-muted/80">{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
