"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardRange } from "@/app/actions/dashboard";

type DashboardRangeSelectorProps = {
  currentRange: DashboardRange;
  from?: string;
  to?: string;
};

const RANGE_OPTIONS: { value: Exclude<DashboardRange, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
];

export function DashboardRangeSelector({
  currentRange,
  from = "",
  to = "",
}: DashboardRangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [fromInput, setFromInput] = React.useState(from);
  const [toInput, setToInput] = React.useState(to);

  React.useEffect(() => {
    setFromInput(from);
    setToInput(to);
  }, [from, to]);

  function navigateWith(next: { range: DashboardRange; from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next.range);

    if (next.range === "custom") {
      if (next.from && next.from.trim() !== "") {
        params.set("from", next.from);
      } else {
        params.delete("from");
      }

      if (next.to && next.to.trim() !== "") {
        params.set("to", next.to);
      } else {
        params.delete("to");
      }
    } else {
      params.delete("from");
      params.delete("to");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleCustomSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWith({
      range: "custom",
      from: fromInput,
      to: toInput,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            type="button"
            variant={currentRange === option.value ? "primary" : "secondary"}
            onClick={() => navigateWith({ range: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-2" onSubmit={handleCustomSubmit}>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>From</span>
          <Input
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            aria-label="Custom range from"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>To (exclusive)</span>
          <Input
            type="date"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            aria-label="Custom range to"
          />
        </label>
        <Button
          size="sm"
          type="submit"
          variant={currentRange === "custom" ? "primary" : "secondary"}
        >
          Apply custom
        </Button>
      </form>
    </div>
  );
}