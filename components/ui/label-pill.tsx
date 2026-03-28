import * as React from "react";

import { hexToRgba } from "@/lib/labels/palette";

type LabelPillProps = {
  name: string;
  colorHex: string;
  className?: string;
};

export function LabelPill({ name, colorHex, className }: LabelPillProps) {
  return (
    <span
      className={[
        "inline-flex h-5 items-center rounded-[4px] border-l-2 px-2 text-[11px] font-medium",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: hexToRgba(colorHex, 0.15),
        borderLeftColor: colorHex,
        color: colorHex,
      }}
    >
      {name}
    </span>
  );
}
