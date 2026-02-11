import Link from "next/link";

import {
  getDashboardSummary,
  type DashboardRange,
  type QueueItemLite,
  type TaskLite,
} from "@/app/actions/dashboard";
import { getDashboardTrends } from "@/app/actions/dashboardTrends";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconDashboard,
  IconFocus,
  IconTasks,
  IconTrophy,
} from "@/components/ui/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DashboardRangeSelector } from "./DashboardRangeSelector";
import { TrendLineChart } from "./TrendLineChart";
import { TrendRangeToggle } from "./TrendRangeToggle";

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
  trend?: string;
}>;

function parseRange(value: string | undefined): DashboardRange {
  if (
    value === "today" ||
    value === "yesterday" ||
    value === "this_week" ||
    value === "last_week" ||
    value === "custom"
  ) {
    return value;
  }
  return "today";
}

function parseTrendDays(value: string | undefined): 7 | 30 {
  return value === "30" ? 30 : 7;
}

function buildTrendHref(
  nextDays: 7 | 30,
  searchParams: { range?: string; from?: string; to?: string; trend?: string },
): string {
  const params = new URLSearchParams();

  if (searchParams.range) params.set("range", searchParams.range);
  if (searchParams.from) params.set("from", searchParams.from);
  if (searchParams.to) params.set("to", searchParams.to);
  params.set("trend", String(nextDays));

  return `/dashboard?${params.toString()}`;
}

function buildEmptyTrendPoints(days: 7 | 30) {
  const now = new Date();
  const todayUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const points: {
    day: string;
    focus_minutes: number;
    completed_tasks: number;
    on_time_rate: number | null;
  }[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(todayUtcMs - index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    points.push({
      day,
      focus_minutes: 0,
      completed_tasks: 0,
      on_time_rate: null,
    });
  }

  return points;
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

function onTimeTasksHrefForRange(
  range: DashboardRange,
  tz: string,
  fromISO: string,
  toISO: string,
): string {
  const fromDate = dateInTimezoneYYYYMMDD(new Date(fromISO), tz);
  const toDateExclusive = dateInTimezoneYYYYMMDD(new Date(toISO), tz);

  if (range === "today" || range === "yesterday") {
    return `/tasks?status=completed&range=day&date=${fromDate}`;
  }

  if (range === "this_week" || range === "last_week") {
    return `/tasks?status=completed&range=week&date=${fromDate}&from=${fromDate}&to=${toDateExclusive}`;
  }

  return `/tasks?status=completed&from=${fromDate}&to=${toDateExclusive}`;
}

function completionMicrocopy(rate: number) {
  if (rate >= 0.8) return "Strong momentum today. Keep the cadence.";
  if (rate >= 0.5)
    return "Solid progress. One focused block can tip this higher.";
  return "Start with a single high-impact task to build momentum.";
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
          className="border-border bg-card rounded-xl border px-3 py-2.5 transition-colors hover:border-emerald-200"
        >
          <p className="text-foreground text-sm font-medium">{item.title}</p>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {item.scheduled_for ? (
              <Badge variant="neutral">Due {item.scheduled_for}</Badge>
            ) : null}
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
        <li
          key={item.task_id}
          className="border-border bg-card rounded-xl border px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-foreground text-sm font-medium">
              {index + 1}. {item.title}
            </p>
            <span className="text-muted-foreground text-xs">
              {formatDateTime(item.created_at, tz)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const range = parseRange(searchParams.range);
  const trendDays = parseTrendDays(searchParams.trend);
  const summary = await getDashboardSummary({
    range,
    from: searchParams.from,
    to: searchParams.to,
  });
  const trendsResult = await getDashboardTrends({ days: trendDays });
  const trendPoints = trendsResult.success
    ? trendsResult.data.points
    : buildEmptyTrendPoints(trendDays);
  const noTrendData = trendPoints.every(
    (point) =>
      point.focus_minutes === 0 &&
      point.completed_tasks === 0 &&
      point.on_time_rate == null,
  );

  const todayInTz = dateInTimezoneYYYYMMDD(new Date(), summary.range.tz);
  const onTimeTasksHref = onTimeTasksHrefForRange(
    range,
    summary.range.tz,
    summary.range.fromISO,
    summary.range.toISO,
  );
  const scheduledTodayHref = `/tasks?range=day&date=${todayInTz}`;
  const unscheduledHref = "/tasks?scheduled=unscheduled";
  const manageTasksHref = range === "today" ? scheduledTodayHref : "/tasks";
  const noActivityInPeriod =
    summary.kpis.created === 0 &&
    summary.kpis.completed === 0 &&
    summary.kpis.archived === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-overline">Overview</p>
          <h1 className="text-page-title text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {summary.range.label} · timezone {summary.range.tz}
          </p>
        </div>
        <Link href="/focus" className={buttonStyles({ size: "sm" })}>
          Quick start focus
        </Link>
      </div>

      <Card variant="accent" className="space-y-3">
        <CardHeader>
          <CardTitle>Range</CardTitle>
          <CardDescription>
            Select a reporting window for KPIs and plan panels.
          </CardDescription>
        </CardHeader>
        <DashboardRangeSelector
          currentRange={range}
          from={searchParams.from}
          to={searchParams.to}
        />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-section-title text-foreground">Trends</h2>
            <p className="text-meta">
              Daily focus, completed tasks, and on-time completion in UTC.
            </p>
          </div>
          <TrendRangeToggle
            currentDays={trendDays}
            hrefForDays={(days) => buildTrendHref(days, searchParams)}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <TrendLineChart
            title="Focus minutes"
            points={trendPoints}
            valueSelector={(point) => point.focus_minutes}
            valueFormatter={(value) => `${Math.round(value ?? 0)}`}
          />
          <TrendLineChart
            title="Completed tasks"
            points={trendPoints}
            valueSelector={(point) => point.completed_tasks}
            valueFormatter={(value) => `${Math.round(value ?? 0)}`}
          />
          <TrendLineChart
            title="On-time rate"
            points={trendPoints}
            valueSelector={(point) => point.on_time_rate}
            valueFormatter={(value) =>
              value == null ? "-" : `${Math.round(value * 100)}%`
            }
            emptyLabel="No scheduled completions yet"
          />
        </div>

        {noTrendData ? (
          <p className="text-muted-foreground text-xs">No data yet.</p>
        ) : null}
        {!trendsResult.success ? (
          <p className="text-xs text-red-700">{trendsResult.error}</p>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Created"
          tooltip="Tasks where created_at is within the selected period."
          value={summary.kpis.created}
          href="/tasks?status=all"
          helperText="Range metric"
          icon={<IconTasks className="h-4 w-4" aria-hidden="true" />}
        />
        <KpiCard
          label="Completed"
          tooltip="Tasks where completed_at is within the selected period."
          value={summary.kpis.completed}
          href="/tasks?status=completed"
          helperText="Range metric"
          icon={<IconTrophy className="h-4 w-4" aria-hidden="true" />}
        />
        <KpiCard
          label="Archived"
          tooltip="Tasks where archived_at is within the selected period."
          value={summary.kpis.archived}
          href="/tasks?status=archived"
          helperText="Range metric"
          icon={<IconDashboard className="h-4 w-4" aria-hidden="true" />}
        />
        <KpiCard
          label="Queue items"
          tooltip="Number of tasks currently in your queue."
          value={summary.kpis.queueCount}
          href="/tasks"
          helperText="Live value"
          icon={<IconFocus className="h-4 w-4" aria-hidden="true" />}
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

      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div>
          <p className="text-overline">Daily completion</p>
          <h2 className="text-section-title">
            {completionMicrocopy(summary.kpis.completionRate)}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Completion based on tasks created in this range.
          </p>
        </div>
        <ProgressRing
          value={summary.kpis.completionRate}
          size={132}
          label="Daily completion rate"
        >
          <p className="numeric-tabular text-foreground text-2xl font-semibold">
            {formatPercent(summary.kpis.completionRate)}
          </p>
          <p className="text-muted-foreground text-xs">done</p>
        </ProgressRing>
      </Card>

      {noActivityInPeriod ? (
        <Card variant="muted">
          <p className="text-muted-foreground text-sm">
            No activity in this period.{" "}
            <Link
              href="/dashboard?range=this_week"
              className="font-medium text-emerald-700 hover:underline"
            >
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
              <p className="text-meta">
                Scheduled and unscheduled tasks for this timezone day.
              </p>
            </div>
            <Link
              href={manageTasksHref}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Manage tasks
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={scheduledTodayHref}
                  className="text-foreground text-sm font-semibold hover:underline"
                >
                  Scheduled today
                </Link>
                <Badge variant="neutral">
                  {summary.today.scheduledTotal} total
                </Badge>
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
                <Link
                  href={unscheduledHref}
                  className="text-foreground text-sm font-semibold hover:underline"
                >
                  Unscheduled
                </Link>
                <Badge variant="neutral">
                  {summary.today.unscheduledTotal} total
                </Badge>
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
            <Link
              href="/tasks"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Manage queue
            </Link>
          </div>
          <p className="text-muted-foreground text-xs">
            {summary.queue.total} item(s) in queue
          </p>
          {renderQueueItems(summary.queue.items, summary.range.tz)}
        </Card>
      </div>
    </div>
  );
}
