"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getNextWeekend() {
  const date = new Date();
  const day = date.getDay();
  const distance = day === 6 ? 7 : (6 - day + 7) % 7;
  date.setDate(date.getDate() + distance);
  return date;
}

type DatePickerPopoverProps = {
  value: string | null;
  onSelect: (value: string | null) => void;
  align?: "left" | "right";
  buttonClassName?: string;
};

export function DatePickerPopover({
  value,
  onSelect,
  align = "left",
  buttonClassName = "",
}: DatePickerPopoverProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value ?? "");
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const today = React.useMemo(() => new Date(), []);
  const tomorrow = React.useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next;
  }, []);
  const nextWeekend = React.useMemo(() => getNextWeekend(), []);

  // Stabilise searchParams into a primitive so it can safely appear in
  // dependency arrays without triggering infinite re-render loops.
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname, searchParamsKey]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function commitInput() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onSelect(null);
      return;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      onSelect(trimmed);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={[
          "focus-ring ui-hover inline-flex h-9 items-center gap-2 rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground hover:bg-muted",
          buttonClassName,
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden="true">📅</span>
        <span>{value ?? "Date"}</span>
      </button>

      {open ? (
        <div
          className={[
            "animate-fadeIn absolute top-[calc(100%+8px)] z-20 w-80 rounded-md border border-border bg-card p-3 shadow-[var(--shadow-lift)]",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          role="dialog"
          aria-label="Date picker"
        >
          <div className="space-y-3">
            <input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onBlur={commitInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitInput();
                  setOpen(false);
                }
              }}
              placeholder="Type a date"
              className="focus-ring ui-hover h-10 w-full rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground"
            />

            <div className="space-y-1">
              {[
                { label: "Today", meta: today.toLocaleDateString("en-US", { weekday: "short" }), value: formatDate(today) },
                { label: "Tomorrow", meta: tomorrow.toLocaleDateString("en-US", { weekday: "short" }), value: formatDate(tomorrow) },
                {
                  label: "Next weekend",
                  meta: nextWeekend.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                  value: formatDate(nextWeekend),
                },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="focus-ring ui-hover flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted"
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.meta}</span>
                </button>
              ))}
            </div>

            <input
              type="date"
              value={value ?? ""}
              onChange={(event) => {
                onSelect(event.target.value || null);
                setInputValue(event.target.value);
              }}
              className="focus-ring ui-hover h-10 w-full rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground"
            />

            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-8 rounded-md border border-border px-3 text-xs text-muted-foreground" disabled>
                Time
              </button>
              <button type="button" className="h-8 rounded-md border border-border px-3 text-xs text-muted-foreground" disabled>
                Repeat
              </button>
              <button
                type="button"
                className="ml-auto h-8 rounded-md border border-border px-3 text-xs text-foreground"
                onClick={() => {
                  onSelect(null);
                  setInputValue("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
