import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const inputStyles =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={[
        inputStyles,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
