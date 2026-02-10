"use client";

import * as React from "react";

type DrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true",
  );
}

/** Mobile modal drawer with focus trapping, Escape close, and focus restore. */
export function Drawer({ title, open, onClose, children }: DrawerProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const previousOverflowRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open || !dialogRef.current) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = dialogRef.current;
    const focusables = getFocusable(container);
    (focusables[0] ?? container).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const ordered = getFocusable(container);
      if (ordered.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />
      <div ref={dialogRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-[var(--shadow-lift)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-section-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted focus-ring"
          >
            <span aria-hidden="true">x</span>
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

