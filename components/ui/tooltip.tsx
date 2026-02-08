"use client";

import * as React from "react";

type TooltipProps = {
  label: string;
};

export function Tooltip({ label }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? id : undefined}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className={[
          "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-10 w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs leading-relaxed text-muted-foreground shadow-[var(--shadow-soft)]",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
