"use client";

import type { TaskPriority } from "@/lib/tasks/types";

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
  tone: string;
}> = [
  { value: 1, label: "Urgent", tone: "var(--destructive)" },
  { value: 2, label: "High", tone: "var(--warning)" },
  { value: 3, label: "Medium", tone: "var(--accent-bright)" },
  { value: 4, label: "Low", tone: "var(--text-ghost)" },
];

type PriorityPickerProps = {
  value: TaskPriority;
  onSelect: (value: TaskPriority) => void;
  className?: string;
};

export function PriorityPicker({
  value,
  onSelect,
  className = "",
}: PriorityPickerProps) {
  const selectedOption =
    PRIORITY_OPTIONS.find((option) => option.value === value) ?? PRIORITY_OPTIONS[3];

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full px-1 py-1",
        className,
      ].join(" ")}
      role="radiogroup"
      aria-label="Task priority"
    >
      {PRIORITY_OPTIONS.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onSelect(option.value)}
            className={[
              "focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-150",
              selected ? "scale-100" : "scale-[0.98] hover:scale-100",
            ].join(" ")}
          >
            <span
              className="h-2.5 w-2.5 rounded-full transition-colors duration-150"
              style={{
                backgroundColor: option.value <= value ? selectedOption.tone : "var(--border)",
                opacity: option.value <= value ? 1 : 0.6,
              }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
