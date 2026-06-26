import { TRAIT_LABELS, type Trait } from "@self-authoring/shared";
import { Badge, bandVariant } from "./Badge";

const TRAIT_COLORS: Record<Trait, string> = {
  O: "bg-trait-o",
  C: "bg-trait-c",
  E: "bg-trait-e",
  A: "bg-trait-a",
  N: "bg-trait-n",
};

interface TraitBarProps {
  trait?: Trait;
  label?: string;
  score: number;
  band: string;
  description?: string;
  compact?: boolean;
}

/** Horizontal trait score visualization with optional description. */
export function TraitBar({
  trait,
  label,
  score,
  band,
  description,
  compact = false,
}: TraitBarProps) {
  const displayLabel = label ?? (trait ? TRAIT_LABELS[trait] : "");
  const barColor = trait ? TRAIT_COLORS[trait] : "bg-primary";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-medium text-primary ${compact ? "text-xs" : "text-sm"}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className={`tabular-nums text-muted ${compact ? "text-xs" : "text-sm"}`}>
            {Math.round(score)}
          </span>
          <Badge variant={bandVariant(band)}>{band}</Badge>
        </div>
      </div>
      <div className={`overflow-hidden rounded-full bg-border ${compact ? "h-1.5" : "h-2.5"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {description && !compact && (
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
