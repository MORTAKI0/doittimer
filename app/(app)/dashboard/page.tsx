import Link from "next/link";

import { getDashboardSummary, type DashboardRange, type QueueItemLite, type TaskLite } from "@/app/actions/dashboard";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
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

function renderTaskItems(items: TaskLite[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{item.title}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.scheduled_for ? <span>Due: {item.scheduled_for}</span> : null}
            {item.completed ? <span>Completed</span> : <span>Open</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderQueueItems(items: QueueItemLite[], tz: string) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items in queue.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.task_id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-foreground">{index + 1}. {item.title}</p>
            <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at, tz)}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.range.label} in {summary.range.tz}
          </p>
        </div>
        <Link href="/focus" className={buttonStyles({ size: "sm" })}>
          Quick start focus
        </Link>
      </div>

      <Card>
        <DashboardRangeSelector
          currentRange={range}
          from={searchParams.from}
          to={searchParams.to}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{summary.kpis.created}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{summary.kpis.completed}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Archived</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{summary.kpis.archived}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Queue items</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{summary.kpis.queueCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Completion rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(summary.kpis.completionRate)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">On-time rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(summary.kpis.onTimeRate)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Today plan</h2>
            <Link href="/tasks" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Manage tasks
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Scheduled today</h3>
                <span className="text-xs text-muted-foreground">{summary.today.scheduledTotal} total</span>
              </div>
              {renderTaskItems(summary.today.scheduled, "No scheduled tasks for today.")}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Unscheduled</h3>
                <span className="text-xs text-muted-foreground">{summary.today.unscheduledTotal} total</span>
              </div>
              {renderTaskItems(summary.today.unscheduled, "No unscheduled tasks.")}
            </section>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Queue</h2>
          <p className="text-xs text-muted-foreground">{summary.queue.total} item(s) in queue</p>
          {renderQueueItems(summary.queue.items, summary.range.tz)}
        </Card>
      </div>
    </div>
  );
}