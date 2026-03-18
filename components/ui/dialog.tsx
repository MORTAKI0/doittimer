"use client";

import * as React from "react";

type DialogProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  descriptionId?: string;
  panelClassName?: string;
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

export function Dialog({
  title,
  open,
  onClose,
  children,
  descriptionId,
  panelClassName = "",
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const previousOverflowRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open || !panelRef.current) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = panelRef.current;
    const focusables = getFocusable(container);
    (focusables[0] ?? container).focus();

    function handleKeyDown(event: KeyboardEvent) {
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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          aria-describedby={descriptionId}
          className={[
            "animate-scaleIn relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border bg-card shadow-[var(--shadow-lift)]",
            "rounded-t-[var(--radius-lg)] sm:max-h-[min(88dvh,720px)] sm:max-w-[680px] sm:rounded-[var(--radius-lg)]",
            panelClassName,
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
