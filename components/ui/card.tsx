import * as React from "react";

export type CardVariant = "default" | "muted" | "interactive";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantStyles: Record<CardVariant, string> = {
  default: "rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]",
  muted:
    "rounded-[var(--radius-md)] border border-border bg-muted/35 p-5 shadow-[var(--shadow-soft)]",
  interactive:
    "rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:border-emerald-200",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={[variantStyles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={["space-y-1.5", className].filter(Boolean).join(" ")} {...props} />;
}

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3 className={["text-card-title text-foreground", className].filter(Boolean).join(" ")} {...props} />
  );
}

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={["text-sm text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />;
}
