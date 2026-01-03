import * as React from "react";

type IconButtonVariant = "neutral" | "danger";
type IconButtonSize = "sm" | "md";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClasses: Record<IconButtonVariant, string> = {
  neutral: "border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

export function IconButton({
  variant = "neutral",
  size = "sm",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-md border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
