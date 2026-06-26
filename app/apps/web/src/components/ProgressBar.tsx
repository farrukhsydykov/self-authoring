interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showCounts?: boolean;
}

/** Horizontal progress bar with optional label and counts. */
export function ProgressBar({ value, max, label, showCounts = false }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="w-full">
      {(label || showCounts) && (
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          {label && <span className="font-medium">{label}</span>}
          <span className="tabular-nums">
            {showCounts ? `${value} / ${max}` : `${pct}%`}
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
