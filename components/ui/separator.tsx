import * as React from "react";

export type SeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <hr
      className={["border-zinc-200", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
