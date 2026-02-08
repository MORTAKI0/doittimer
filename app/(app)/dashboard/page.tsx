import Link from "next/link";

import {
  getDashboardSummary,
  type DashboardRange,
  type QueueItemLite,
  type TaskLite,
} from "@/app/actions/dashboard";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { DashboardRangeSelector } from "./DashboardRangeSelector";

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
}>;

function parseRange(value: string | undefined): DashboardRange {
  if (
    value === "today"
    || value === "yesterday"
    || value === "this_week"
    || value === "last_week"
    || value === "custom"
  ) {
    return value;
  }
  return "today";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateInTimezoneYYYYMMDD(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function renderTaskItems(
  items: TaskLite[],
  emptyTitle: string,
  emptyMessage: string,
  emptyCtaLabel: string,
  emptyCtaHref: string,
) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyMessage}
        actionLabel={emptyCtaLabel}
        actionHref={emptyCtaHref}
        className="min-h-[140px]"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-emerald-200"
        >
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {item.scheduled_for ? <Badge variant="neutral">Due {item.scheduled_for}</Badge> : null}
            <Badge variant={item.completed ? "success" : "neutral"}>
              {item.completed ? "Completed" : "Open"}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderQueueItems(items: QueueItemLite[], tz: string) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Queue is empty"
        description="Add tasks to queue so your next focus target is always clear."
        actionLabel="Add to queue"
        actionHref="/tasks"
        className="min-h-[140px]"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.task_id} className="rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{index + 1}. {item.title}</p>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(item.created_at, tz)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const range = parseRange(searchParams.range);
  const summary = await getDashboardSummary({
    range,
    from: searchParams.from,
    to: searchParams.to,
  });

  const todayInTz = dateInTimezoneYYYYMMDD(new Date(), summary.range.tz);
  const onTimeTasksHref = `/tasks?status=completed&range=day&date=${todayInTz}`;
  const scheduledTodayHref = `/tasks?range=day&date=${todayInTz}`;
  const unscheduledHref = "/tasks?scheduled=unscheduled";
  const manageTasksHref = range === "today" ? scheduledTodayHref : "/tasks";
  const noActivityInPeriod =
    summary.kpis.created === 0 && summary.kpis.completed === 0 && summary.kpis.archived === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-page-title text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {summary.range.label}
            {" · "}
            timezone {summary.range.tz}
          </p>
        </div>
        <Link href="/focus" className={buttonStyles({ size: "sm" })}>
          Quick start focus
        </Link>
      </div>

      <Card className="space-y-3">
        <CardHeader>
          <CardTitle>Range</CardTitle>
          <CardDescription>Select a reporting window for KPIs and plan panels.</CardDescription>
        </CardHeader>
        <DashboardRangeSelector currentRange={range} from={searchParams.from} to={searchParams.to} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Created"
          tooltip="Tasks where created_at is within the selected period."
          value={summary.kpis.created}
          href="/tasks?status=all"
          helperText="Range metric"
        />
        <KpiCard
          label="Completed"
          tooltip="Tasks where completed_at is within the selected period."
          value={summary.kpis.completed}
          href="/tasks?status=completed"
          helperText="Range metric"
        />
        <KpiCard
          label="Archived"
          tooltip="Tasks where archived_at is within the selected period."
          value={summary.kpis.archived}
          href="/tasks?status=archived"
          helperText="Range metric"
        />
        <KpiCard
          label="Queue items"
          tooltip="Number of tasks currently in your queue."
          value={summary.kpis.queueCount}
          href="/tasks"
          helperText="Live value"
        />
        <KpiCard
          label="Completion rate"
          tooltip="Completed divided by created for the selected range."
          value={formatPercent(summary.kpis.completionRate)}
          href="/tasks?status=completed"
          helperText="Range metric"
        />
        <KpiCard
          label="On-time rate"
          tooltip="Completed tasks finished on or before their scheduled date in your timezone."
          value={formatPercent(summary.kpis.onTimeRate)}
          href={onTimeTasksHref}
          helperText={`Based on ${summary.range.tz}`}
        />
      </div>

      {noActivityInPeriod ? (
        <Card variant="muted">
          <p className="text-sm text-muted-foreground">
            No activity in this period.
            {" "}
            <Link href="/dashboard?range=this_week" className="font-medium text-emerald-700 hover:underline">
              Try this week
            </Link>
            .
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-section-title text-foreground">Today plan</h2>
              <p className="text-meta">Scheduled and unscheduled tasks for this timezone day.</p>
            </div>
            <Link href={manageTasksHref} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Manage tasks
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Link href={scheduledTodayHref} className="text-sm font-semibold text-foreground hover:underline">
                  Scheduled today
                </Link>
                <Badge variant="neutral">{summary.today.scheduledTotal} total</Badge>
              </div>
              {renderTaskItems(
                summary.today.scheduled,
                "Nothing scheduled",
                "Plan your day by adding at least one scheduled task.",
                "Plan today",
                scheduledTodayHref,
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Link href={unscheduledHref} className="text-sm font-semibold text-foreground hover:underline">
                  Unscheduled
                </Link>
                <Badge variant="neutral">{summary.today.unscheduledTotal} total</Badge>
              </div>
              {renderTaskItems(
                summary.today.unscheduled,
                "Nothing in backlog",
                "Capture ideas here, then schedule them when ready.",
                "Create task",
                "/tasks",
              )}
            </section>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-section-title text-foreground">Queue</h2>
              <p className="text-meta">Ordered list used for focus handoff.</p>
            </div>
            <Link href="/tasks" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Manage queue
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">{summary.queue.total} item(s) in queue</p>
          {renderQueueItems(summary.queue.items, summary.range.tz)}
        </Card>
      </div>
    </div>
  );
}
