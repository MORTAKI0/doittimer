import Link from "next/link";

import {
  getDashboardSummary,
  getWorkTotals,
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
  IconFlame,
  IconFocus,
  IconPulse,
  IconSparkles,
  IconTasks,
  IconTrophy,
} from "@/components/ui/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { DashboardRangeSelector } from "./DashboardRangeSelector";
import { TrendLineChart } from "./TrendLineChart";
import { TrendRangeToggle } from "./TrendRangeToggle";
import { WorkTotalsCards } from "./WorkTotalsCards";

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
  trend?: string;
}>;

type InsightCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: React.ReactNode;
};

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

function formatHoursMinutes(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  return `${hours}h ${minutes}m`;
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
  if (rate >= 0.8) return "Strong momentum. Keep the cadence.";
  if (rate >= 0.5) return "Solid progress. One focused block can push this higher.";
  return "Start with one high-impact task to build momentum.";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTaskCount(value: number): string {
  return `${value} ${value === 1 ? "task" : "tasks"}`;
}

function throughputTitle(created: number, completed: number): string {
  if (created === 0 && completed === 0) return "Quiet window so far";
  if (completed > created) return "You are closing faster than you capture";
  if (completed === created) return "Capture and completion are in balance";
  return "New intake is outrunning completion";
}

function backlogTitle(unscheduledTotal: number): string {
  if (unscheduledTotal === 0) return "Backlog is under control";
  if (unscheduledTotal <= 3) return "A few ideas still need scheduling";
  return "Backlog is getting heavy";
}

function queueTitle(total: number): string {
  if (total === 0) return "Queue needs a next move";
  if (total <= 3) return "Queue is tidy and ready";
  return "Queue is stocked for multiple sessions";
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
        className="min-h-[180px]"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-[1.25rem] border border-border/80 bg-white/80 px-4 py-3 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-emerald-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {item.scheduled_for ? (
                  <Badge variant="neutral">Due {item.scheduled_for}</Badge>
                ) : null}
                <Badge variant={item.completed ? "success" : "neutral"}>
                  {item.completed ? "Completed" : "Open"}
                </Badge>
              </div>
            </div>
            <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500/80" aria-hidden="true" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function QueuePanel({ items, total, tz }: { items: QueueItemLite[]; total: number; tz: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Queue is empty"
        description="Add tasks to the queue so your next focus target is always obvious."
        actionLabel="Build queue"
        actionHref="/tasks"
        className="min-h-[220px]"
      />
    );
  }

  const [nextUp, ...rest] = items;

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.9))] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-overline">Next up</p>
            <h3 className="text-xl font-semibold text-foreground">{nextUp.title}</h3>
            <p className="text-sm text-muted-foreground">
              Queued {formatDateTime(nextUp.created_at, tz)}.
            </p>
          </div>
          <Badge variant="accent">1 of {total}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/focus" className={buttonStyles({ size: "sm" })}>
            Open focus
          </Link>
          <Link href="/tasks" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Manage queue
          </Link>
        </div>
      </div>

      {rest.length > 0 ? (
        <ul className="space-y-3">
          {rest.map((item, index) => (
            <li
              key={item.task_id}
              className="rounded-[1.25rem] border border-border/80 bg-white/80 px-4 py-3 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {index + 2}. {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added {formatDateTime(item.created_at, tz)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  description,
  href,
  ctaLabel,
  icon,
}: InsightCardProps) {
  return (
    <Link href={href} className="group block rounded-[1.5rem] focus-ring">
      <Card variant="interactive" className="h-full space-y-4 rounded-[1.5rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-overline">{eyebrow}</p>
          <span className="text-emerald-600">{icon}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
          {ctaLabel}
        </p>
      </Card>
    </Link>
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
  const workTotals = await getWorkTotals();
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
  const totalActiveTasks = summary.today.scheduledTotal + summary.today.unscheduledTotal;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.75fr)_400px] xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <Card variant="accent" className="animate-fadeInUp space-y-6 p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <Badge variant="accent" className="border-emerald-200/80 bg-white/65 text-emerald-800">
                {getGreeting()}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-page-title text-foreground">Dashboard</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Clear view of execution, backlog, and the next best move for your focus loop.
                </p>
              </div>
            </div>
            <Link href="/focus" className={buttonStyles({ size: "sm" })}>
              Quick start focus
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 px-4 py-3 shadow-[var(--shadow-soft)]">
              <p className="text-overline">Reporting window</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{summary.range.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Current KPI context</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 px-4 py-3 shadow-[var(--shadow-soft)]">
              <p className="text-overline">Timezone</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{summary.range.tz}</p>
              <p className="mt-1 text-xs text-muted-foreground">Used for dates and on-time logic</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/70 bg-white/70 px-4 py-3 shadow-[var(--shadow-soft)]">
              <p className="text-overline">Open loop</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatTaskCount(totalActiveTasks)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Scheduled plus unscheduled active tasks</p>
            </div>
          </div>
        </Card>

        <Card className="animate-fadeInUp space-y-4 rounded-[1.75rem] p-6">
          <CardHeader className="space-y-2">
            <CardTitle>Reporting range</CardTitle>
            <CardDescription>
              Change the window without losing task, queue, or trend context.
            </CardDescription>
          </CardHeader>
          <DashboardRangeSelector
            currentRange={range}
            from={searchParams.from}
            to={searchParams.to}
          />
          <div className="rounded-[1.25rem] border border-border/80 bg-muted/25 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Selected</span>
              <span className="font-medium text-foreground">{summary.range.label}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Focus today</span>
              <span className="font-medium text-foreground">
                {formatHoursMinutes(workTotals.todaySeconds)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Custom ranges use your saved timezone and keep the existing summary contract unchanged.
            </p>
          </div>
        </Card>
      </section>

      <WorkTotalsCards
        today={formatHoursMinutes(workTotals.todaySeconds)}
        week={formatHoursMinutes(workTotals.weekSeconds)}
        month={formatHoursMinutes(workTotals.monthSeconds)}
      />

      <section className="animate-fadeInUp stagger-2 grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
        <div className="card-hover-lift xl:col-span-1">
          <KpiCard
            variant="accent"
            label="Completed"
            tooltip="Tasks where completed_at is within the selected period."
            value={summary.kpis.completed}
            href="/tasks?status=completed"
            helperText={
              summary.kpis.created > 0
                ? `${summary.kpis.completed} of ${summary.kpis.created} closed in this window`
                : "No captured tasks in this window yet"
            }
            icon={<IconTrophy className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div className="card-hover-lift">
          <KpiCard
            label="Completion rate"
            tooltip="Completed divided by created for the selected range."
            value={formatPercent(summary.kpis.completionRate)}
            href="/tasks?status=completed"
            helperText={completionMicrocopy(summary.kpis.completionRate)}
            icon={<IconPulse className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div className="card-hover-lift">
          <KpiCard
            label="On-time rate"
            tooltip="Completed tasks finished on or before their scheduled date in your timezone."
            value={formatPercent(summary.kpis.onTimeRate)}
            href={onTimeTasksHref}
            helperText={`Measured in ${summary.range.tz}`}
            icon={<IconSparkles className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div className="card-hover-lift">
          <KpiCard
            label="Queue items"
            tooltip="Number of tasks currently in your queue."
            value={summary.kpis.queueCount}
            href="/tasks"
            helperText={summary.kpis.queueCount > 0 ? "Ready for fast handoff" : "Build a queue for smoother focus switching"}
            icon={<IconFocus className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)] 2xl:grid-cols-[minmax(0,1.85fr)_380px]">
        <Card className="animate-fadeInUp stagger-3 space-y-6 rounded-[1.75rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-overline">Execution board</p>
              <h2 className="text-section-title text-foreground">Today plan</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Scheduled work and loose backlog for the current timezone day.
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
            <section className="space-y-3 rounded-[1.5rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.88))] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={scheduledTodayHref}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    Scheduled today
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Time-bound tasks ready to execute next.
                  </p>
                </div>
                <Badge variant="neutral">{summary.today.scheduledTotal} total</Badge>
              </div>
              {renderTaskItems(
                summary.today.scheduled,
                "Nothing scheduled",
                "Plan your day by assigning at least one task to today.",
                "Plan today",
                scheduledTodayHref,
              )}
            </section>

            <section className="space-y-3 rounded-[1.5rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.88))] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={unscheduledHref}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    Unscheduled backlog
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ideas and follow-ups that still need a slot.
                  </p>
                </div>
                <Badge variant="neutral">{summary.today.unscheduledTotal} total</Badge>
              </div>
              {renderTaskItems(
                summary.today.unscheduled,
                "Nothing in backlog",
                "Capture tasks here first, then schedule the ones that matter next.",
                "Create task",
                "/tasks",
              )}
            </section>
          </div>
        </Card>

        <Card className="animate-fadeInUp stagger-3 space-y-5 rounded-[1.75rem] p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-overline">Focus handoff</p>
              <h2 className="text-section-title text-foreground">Queue</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ordered list used to keep the next session frictionless.
              </p>
            </div>
            <Link
              href="/tasks"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Manage queue
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">{summary.queue.total} item(s) in queue</p>
          <QueuePanel items={summary.queue.items} total={summary.queue.total} tz={summary.range.tz} />
        </Card>
      </section>

      <section className="grid gap-4 2xl:grid-cols-3 xl:grid-cols-2">
        <InsightCard
          eyebrow="Flow balance"
          title={throughputTitle(summary.kpis.created, summary.kpis.completed)}
          description={`Created ${summary.kpis.created} and completed ${summary.kpis.completed} during ${summary.range.label.toLowerCase()}. Keep intake lower than output to stay ahead.`}
          href="/tasks?status=all"
          ctaLabel="Review task flow"
          icon={<IconDashboard className="h-5 w-5" aria-hidden="true" />}
        />
        <InsightCard
          eyebrow="Backlog pressure"
          title={backlogTitle(summary.today.unscheduledTotal)}
          description={`${formatTaskCount(summary.today.unscheduledTotal)} remain unscheduled and ${formatTaskCount(summary.today.scheduledTotal)} are already on today's board.`}
          href={summary.today.unscheduledTotal > 0 ? unscheduledHref : scheduledTodayHref}
          ctaLabel="Triage backlog"
          icon={<IconTasks className="h-5 w-5" aria-hidden="true" />}
        />
        <InsightCard
          eyebrow="Queue readiness"
          title={queueTitle(summary.kpis.queueCount)}
          description={
            summary.kpis.queueCount > 0
              ? `The queue currently holds ${formatTaskCount(summary.kpis.queueCount)} for fast switching between focus blocks.`
              : "You have no queued tasks right now. Add one from Tasks to remove decision friction before the next session."
          }
          href={summary.kpis.queueCount > 0 ? "/focus" : "/tasks"}
          ctaLabel={summary.kpis.queueCount > 0 ? "Open focus" : "Build queue"}
          icon={<IconFlame className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      <Card className="animate-fadeInUp stagger-3 space-y-5 rounded-[1.75rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-overline">Trends</p>
            <h2 className="text-section-title text-foreground">Execution over time</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Daily focus minutes, completed tasks, and on-time completion in UTC.
            </p>
          </div>
          <TrendRangeToggle
            currentDays={trendDays}
            hrefForDays={(days) => buildTrendHref(days, searchParams)}
          />
        </div>

        <div className="grid gap-4 2xl:grid-cols-3 xl:grid-cols-2">
          <div className="card-hover-lift rounded-[1.5rem]">
            <TrendLineChart
              title="Focus minutes"
              points={trendPoints}
              valueSelector={(point) => point.focus_minutes}
              valueFormatter={(value) => `${Math.round(value ?? 0)}`}
            />
          </div>
          <div className="card-hover-lift rounded-[1.5rem]">
            <TrendLineChart
              title="Completed tasks"
              points={trendPoints}
              valueSelector={(point) => point.completed_tasks}
              valueFormatter={(value) => `${Math.round(value ?? 0)}`}
            />
          </div>
          <div className="card-hover-lift rounded-[1.5rem]">
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
        </div>

        {noTrendData ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/20 p-5 text-center">
            <p className="text-sm text-muted-foreground">No trend data yet for this period.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/focus" className="font-medium text-emerald-700 hover:underline">
                Start a focus session
              </Link>{" "}
              to populate this panel.
            </p>
          </div>
        ) : null}
        {!trendsResult.success ? (
          <p className="text-xs text-red-700">{trendsResult.error}</p>
        ) : null}
      </Card>
    </div>
  );
}


