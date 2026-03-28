"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { LabelPill } from "@/components/ui/label-pill";
import { Select } from "@/components/ui/select";
import type { LabelRecord } from "@/app/actions/labels";

type TasksFiltersBarProps = {
  projects: { id: string; name: string }[];
  labels: LabelRecord[];
  currentStatus: "active" | "completed" | "archived" | "all";
  currentRange: "all" | "day" | "week";
  currentDate: string;
  currentProjectId: string | null;
  currentLabelIds: string[];
  currentScheduledOnly: "all" | "scheduled" | "unscheduled";
  currentQuery: string;
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
  labels,
  currentStatus,
  currentRange,
  currentDate,
  currentProjectId,
  currentLabelIds,
  currentScheduledOnly,
  currentQuery,
}: TasksFiltersBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [queryInput, setQueryInput] = React.useState(currentQuery);

  React.useEffect(() => {
    setQueryInput(currentQuery);
  }, [currentQuery]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParamsKey]);

  const today = React.useMemo(() => formatDate(new Date()), []);
  const tomorrow = React.useMemo(() => formatDate(addDays(new Date(), 1)), []);
  const selectedLabelIdSet = React.useMemo(() => new Set(currentLabelIds), [currentLabelIds]);

  function pushParams(
    updater: (params: URLSearchParams) => void,
    options?: { resetPage?: boolean },
  ) {
    const params = new URLSearchParams(searchParamsKey);
    updater(params);
    if (options?.resetPage ?? true) {
      params.set("page", "1");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function toggleLabel(labelId: string) {
    pushParams((params) => {
      const nextLabelIds = new Set(searchParams.getAll("labelId"));
      if (nextLabelIds.has(labelId)) {
        nextLabelIds.delete(labelId);
      } else {
        nextLabelIds.add(labelId);
      }

      params.delete("labelId");
      Array.from(nextLabelIds)
        .sort((a, b) => a.localeCompare(b))
        .forEach((value) => params.append("labelId", value));
    });
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

  const filterControls = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Status
          <Select
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
            className="h-9"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Project
          <Select
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
            className="h-9"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Schedule
          <Select
            value={currentScheduledOnly}
            onChange={(event) => {
              const value = event.target.value as "all" | "scheduled" | "unscheduled";
              pushParams((params) => {
                if (value === "all") {
                  params.delete("scheduled");
                } else {
                  params.set("scheduled", value);
                }
              });
            }}
            className="h-9"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Date
          <Input
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
            aria-label="Filter by scheduled date"
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-md border-[0.5px] border-border bg-background p-1">
          <Button size="sm" type="button" variant={currentStatus === "active" ? "primary" : "ghost"} onClick={() => pushParams((params) => params.set("status", "active"))}>Active</Button>
          <Button size="sm" type="button" variant={currentStatus === "completed" ? "primary" : "ghost"} onClick={() => pushParams((params) => params.set("status", "completed"))}>Completed</Button>
          <Button size="sm" type="button" variant={currentStatus === "archived" ? "primary" : "ghost"} onClick={() => pushParams((params) => params.set("status", "archived"))}>Archived</Button>
        </div>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => {
            pushParams((params) => {
              params.delete("project");
              params.delete("labelId");
              params.delete("status");
              params.delete("range");
              params.delete("date");
              params.delete("scheduled");
              params.delete("q");
              params.delete("from");
              params.delete("to");
            });
          }}
        >
          Clear filters
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">Labels</span>
          {currentLabelIds.length > 0 ? (
            <span className="text-xs text-muted-foreground">{currentLabelIds.length} selected</span>
          ) : null}
        </div>
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create labels in Filters & Labels to filter tasks here.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const isSelected = selectedLabelIdSet.has(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={[
                    "focus-ring rounded-md",
                    isSelected ? "ring-1 ring-foreground/20" : "",
                  ].join(" ")}
                  onClick={() => toggleLabel(label.id)}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Remove" : "Add"} label filter ${label.name}`}
                >
                  <LabelPill name={label.name} colorHex={label.colorHex} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 border-b-[0.5px] border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" type="button" variant={isToday ? "primary" : "secondary"} onClick={() => setQuickRange("today")}>Today</Button>
        <Button size="sm" type="button" variant={isTomorrow ? "primary" : "secondary"} onClick={() => setQuickRange("tomorrow")}>Tomorrow</Button>
        <Button size="sm" type="button" variant={isWeek ? "primary" : "secondary"} onClick={() => setQuickRange("week")}>This Week</Button>
        <Button size="sm" type="button" variant={isAll ? "primary" : "secondary"} onClick={() => setQuickRange("all")}>All</Button>
        <div className="ml-auto">
          <Button size="sm" type="button" variant="secondary" className="md:hidden" onClick={() => setMobileOpen(true)}>
            Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <Input
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              pushParams((params) => {
                const value = queryInput.trim();
                if (!value) params.delete("q");
                else params.set("q", value);
              });
            }
          }}
          placeholder="Search tasks by title"
          aria-label="Search tasks"
        />
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => {
            pushParams((params) => {
              const value = queryInput.trim();
              if (!value) params.delete("q");
              else params.set("q", value);
            });
          }}
        >
          Search
        </Button>
      </div>

      <div className="hidden md:block">{filterControls}</div>

      <Drawer title="Task filters" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {filterControls}
      </Drawer>
    </div>
  );
}

