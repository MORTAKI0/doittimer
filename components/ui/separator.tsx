import * as React from "react";

export type SeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <hr
      className={["ui-divider", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
