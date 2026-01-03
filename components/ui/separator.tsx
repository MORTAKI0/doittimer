import * as React from "react";

export type SeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <hr
      className={["border-border", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
