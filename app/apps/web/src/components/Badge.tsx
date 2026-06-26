interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent" | "trait";
  className?: string;
}

const variants = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  accent: "bg-accent/15 text-accent-dark ring-1 ring-accent/30",
  trait: "bg-primary/8 text-primary ring-1 ring-primary/15",
};

/** Small status or label badge. */
export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Maps OCEAN band labels to badge variants. */
export function bandVariant(band: string): BadgeProps["variant"] {
  if (band === "high") return "success";
  if (band === "medium") return "warning";
  return "danger";
}
