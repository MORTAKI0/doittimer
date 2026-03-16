"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { IconCheck } from "@/components/ui/icons";
import type { TaskPriority } from "@/lib/tasks/types";

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
  description: string;
  color: string;
}> = [
  { value: 1, label: "Priority 1", description: "urgent", color: "var(--priority-1)" },
  { value: 2, label: "Priority 2", description: "high", color: "var(--priority-2)" },
  { value: 3, label: "Priority 3", description: "medium", color: "var(--priority-3)" },
  { value: 4, label: "Priority 4", description: "normal", color: "var(--priority-4)" },
];

type PriorityPickerProps = {
  value: TaskPriority;
  onSelect: (value: TaskPriority) => void;
  align?: "left" | "right";
  buttonClassName?: string;
};

export function PriorityPicker({
  value,
  onSelect,
  align = "left",
  buttonClassName = "",
}: PriorityPickerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    setOpen(false);
  }, [pathname, searchParamsKey]);

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
        <span
          className="h-3.5 w-3.5 rounded-full border-[1.5px]"
          style={{ borderColor: `var(--priority-${value})`, backgroundColor: "transparent" }}
          aria-hidden="true"
        />
        <span>P{value}</span>
      </button>

      {open ? (
        <div
          className={[
            "animate-fadeIn absolute top-[calc(100%+8px)] z-20 w-64 rounded-md border border-border bg-card p-2 shadow-[var(--shadow-soft)]",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          role="dialog"
          aria-label="Priority picker"
        >
          <ul className="space-y-1">
            {PRIORITY_OPTIONS.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    className={[
                      "focus-ring ui-hover flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                      selected ? "bg-muted text-foreground" : "text-foreground hover:bg-muted",
                    ].join(" ")}
                    onClick={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border-[1.5px]"
                        style={{ borderColor: option.color }}
                        aria-hidden="true"
                      />
                      <span>
                        {option.label} ({option.description})
                      </span>
                    </span>
                    {selected ? <IconCheck className="h-4 w-4 text-foreground" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
