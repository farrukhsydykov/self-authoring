import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/** Elevated surface card with consistent styling. */
export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-elevated shadow-sm ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
