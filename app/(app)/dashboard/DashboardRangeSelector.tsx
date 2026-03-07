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

/** Dashboard range switcher supporting presets plus custom date boundaries. */
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
    <div className="space-y-4">
      <div className="inline-flex w-full flex-wrap gap-1 rounded-2xl border border-border/80 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => navigateWith({ range: option.value })}
            className={[
              "rounded-xl px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35",
              currentRange === option.value
                ? "bg-emerald-600 text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,0.8)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form
        className="space-y-3 rounded-2xl border border-border/80 bg-[linear-gradient(180deg,rgba(250,250,250,0.96),rgba(244,244,245,0.72))] p-4"
        onSubmit={handleCustomSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.18em] text-[11px]">From</span>
            <Input
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              aria-label="Custom range from"
              className="min-w-0"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.18em] text-[11px]">To</span>
            <Input
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              aria-label="Custom range to"
              className="min-w-0"
            />
          </label>
        </div>
        <Button
          size="md"
          type="submit"
          variant={currentRange === "custom" ? "primary" : "secondary"}
          className="w-full"
        >
          Apply custom range
        </Button>
      </form>
    </div>
  );
}
