import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

/** Styled button component. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3 text-sm",
  };
  const variants = {
    primary: "bg-primary text-white shadow-sm hover:bg-primary-light active:scale-[0.98]",
    secondary:
      "border border-border bg-surface-elevated text-slate-800 hover:border-primary/20 hover:bg-surface",
    ghost: "text-primary hover:bg-primary/5",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
