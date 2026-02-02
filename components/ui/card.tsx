import * as React from "react";

export type CardVariant = "default" | "glass" | "glow";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantStyles: Record<CardVariant, string> = {
  default: "rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm",
  glass: "rounded-2xl glass-card p-5 transition-all duration-300 card-hover-lift",
  glow: "rounded-2xl border border-border bg-card p-5 transition-all duration-300 card-hover-lift card-glow",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={[variantStyles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
