"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type TasksFiltersBarProps = {
  projects: { id: string; name: string }[];
  currentStatus: "active" | "completed" | "archived" | "all";
  currentRange: "all" | "day" | "week";
  currentDate: string;
  currentProjectId: string | null;
};

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function TasksFiltersBar({
  projects,
  currentStatus,
  currentRange,
  currentDate,
  currentProjectId,
}: TasksFiltersBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = React.useMemo(() => formatDate(new Date()), []);
  const tomorrow = React.useMemo(() => formatDate(addDays(new Date(), 1)), []);

  function pushParams(
    updater: (params: URLSearchParams) => void,
    options?: { resetPage?: boolean },
  ) {
    const params = new URLSearchParams(searchParams);
    updater(params);
    if (options?.resetPage ?? true) {
      params.set("page", "1");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setQuickRange(mode: "today" | "tomorrow" | "week" | "all") {
    pushParams((params) => {
      if (mode === "today") {
        params.set("range", "day");
        params.set("date", today);
        return;
      }
      if (mode === "tomorrow") {
        params.set("range", "day");
        params.set("date", tomorrow);
        return;
      }
      if (mode === "week") {
        params.set("range", "week");
        params.set("date", today);
        return;
      }
      params.delete("range");
      params.delete("date");
    });
  }

  const isToday = currentRange === "day" && currentDate === today;
  const isTomorrow = currentRange === "day" && currentDate === tomorrow;
  const isWeek = currentRange === "week";
  const isAll = currentRange === "all";

  return (
    <div className="rounded-xl border border-border bg-gradient-to-r from-emerald-50/40 to-transparent p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant={isToday ? "primary" : "secondary"}
            onClick={() => setQuickRange("today")}
          >
            Today
          </Button>
          <Button
            size="sm"
            type="button"
            variant={isTomorrow ? "primary" : "secondary"}
            onClick={() => setQuickRange("tomorrow")}
          >
            Tomorrow
          </Button>
          <Button
            size="sm"
            type="button"
            variant={isWeek ? "primary" : "secondary"}
            onClick={() => setQuickRange("week")}
          >
            This Week
          </Button>
          <Button
            size="sm"
            type="button"
            variant={isAll ? "primary" : "secondary"}
            onClick={() => setQuickRange("all")}
          >
            All
          </Button>
          <input
            type="date"
            value={currentRange === "day" ? currentDate : ""}
            onChange={(event) => {
              const value = event.target.value;
              pushParams((params) => {
                if (!value) {
                  params.delete("range");
                  params.delete("date");
                  return;
                }
                params.set("range", "day");
                params.set("date", value);
              });
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
            aria-label="Filter by scheduled date"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </label>
          <select
            value={currentStatus}
            onChange={(event) => {
              const value = event.target.value as "active" | "completed" | "archived" | "all";
              pushParams((params) => {
                if (value === "all") {
                  params.delete("status");
                } else {
                  params.set("status", value);
                }
              });
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project
          </label>
          <select
            value={currentProjectId ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              pushParams((params) => {
                if (value === "all") {
                  params.delete("project");
                } else {
                  params.set("project", value);
                }
              });
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => {
              pushParams((params) => {
                params.delete("project");
                params.delete("status");
                params.delete("range");
                params.delete("date");
              });
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}
