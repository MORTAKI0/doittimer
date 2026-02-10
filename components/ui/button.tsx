import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 transition-standard focus-visible:outline-none focus-ring disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:-translate-y-0.5 hover:border-emerald-700 hover:bg-emerald-700 hover:shadow-[var(--shadow-lift)]",
  secondary:
    "border border-border bg-card text-foreground shadow-sm hover:border-border/80 hover:bg-muted/70",
  ghost: "border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5",
  md: "h-10 px-4",
  lg: "h-11 px-5",
  icon: "h-10 w-10",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  className = "",
}: ButtonStyleOptions = {}) {
  return [baseClasses, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  isLoading = false,
  loadingLabel,
  children,
  ...props
}: ButtonProps) {
  const text =
    isLoading && typeof loadingLabel === "string" && loadingLabel.trim().length > 0
      ? loadingLabel
      : children;
  const showIconChildren = size === "icon" && !isLoading;

  return (
    <button
      className={buttonStyles({ variant, size, className })}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : null}
      {size !== "icon" ? text : showIconChildren ? children : null}
      {size === "icon" && isLoading ? <span className="sr-only">Loading</span> : null}
    </button>
  );
}

