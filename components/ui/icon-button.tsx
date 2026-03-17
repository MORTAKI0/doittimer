import * as React from "react";

type IconButtonVariant = "neutral" | "danger";
type IconButtonSize = "sm" | "md";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClasses: Record<IconButtonVariant, string> = {
  neutral: "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
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
        "focus-ring ui-hover inline-flex items-center justify-center rounded-md border-[0.5px] bg-card disabled:pointer-events-none disabled:opacity-50",
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
