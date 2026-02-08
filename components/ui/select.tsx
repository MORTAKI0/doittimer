import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const selectStyles =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50";

export function Select({ className, ...props }: SelectProps) {
  return (
    <select className={[selectStyles, className].filter(Boolean).join(" ")} {...props} />
  );
}
