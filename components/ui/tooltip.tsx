"use client";

import * as React from "react";

type TooltipProps = {
  label: string;
  triggerLabel?: string;
  children?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
};

function composeHandlers<E>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event);
    ours(event);
  };
}

/** Provides accessible tooltip text on hover/focus without introducing nested buttons. */
export function Tooltip({ label, triggerLabel = "More info", children }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const id = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const triggerProps: React.HTMLAttributes<HTMLElement> = {
    "aria-describedby": id,
    onFocus: () => setIsOpen(true),
    onBlur: () => setIsOpen(false),
    onMouseEnter: () => setIsOpen(true),
    onMouseLeave: () => setIsOpen(false),
  };

  const mergedChild = children
    ? React.cloneElement(children, {
      ...triggerProps,
      onFocus: composeHandlers(children.props.onFocus, () => setIsOpen(true)),
      onBlur: composeHandlers(children.props.onBlur, () => setIsOpen(false)),
      onMouseEnter: composeHandlers(children.props.onMouseEnter, () => setIsOpen(true)),
      onMouseLeave: composeHandlers(children.props.onMouseLeave, () => setIsOpen(false)),
    })
    : null;

  return (
    <span className="relative inline-flex items-center">
      {mergedChild ?? (
        <button
          type="button"
          aria-label={triggerLabel}
          {...triggerProps}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground focus-ring"
        >
          i
        </button>
      )}
      <span
        id={id}
        role="tooltip"
        aria-hidden={!isOpen}
        className={[
          "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs leading-relaxed text-muted-foreground shadow-[var(--shadow-soft)] transition-opacity duration-150",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}

