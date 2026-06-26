interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/** Circular progress indicator for module completion. */
export function ProgressRing({
  percent,
  size = 48,
  strokeWidth = 4,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-accent transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-primary">
        {label ?? `${Math.round(percent)}%`}
      </span>
    </div>
  );
}
