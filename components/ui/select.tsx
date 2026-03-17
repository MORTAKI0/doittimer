import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const selectStyles =
  "focus-ring ui-hover h-10 w-full rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50";

export function Select({ className, ...props }: SelectProps) {
  return (
    <select className={[selectStyles, className].filter(Boolean).join(" ")} {...props} />
  );
}
