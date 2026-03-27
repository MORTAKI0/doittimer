import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";

import { getActiveSession } from "@/app/actions/sessions";
import { getUserSettings } from "@/app/actions/settings";
import { getTasks, getTodayTasks } from "@/app/actions/tasks";
import { TaskList } from "@/app/(app)/tasks/components/TaskList";
import { buttonStyles } from "@/components/ui/button";
import { IconFocus, IconSparkles, IconTasks } from "@/components/ui/icons";
import { getUser } from "@/lib/auth/get-user";

import { HomeQuickCreate } from "./HomeQuickCreate";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
});

function formatLongDateLabel(dateOnly: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateOnly}T12:00:00`));
}

function getHourInTimeZone(timeZone: string) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).format(new Date());

  const parsed = Number.parseInt(hour, 10);
  return Number.isFinite(parsed) ? parsed : new Date().getHours();
}

function getGreetingForTimeZone(timeZone: string) {
  const hour = getHourInTimeZone(timeZone);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function normalizeFirstName(value: string | null) {
  if (!value) return null;
  const firstToken = value.trim().split(/\s+/)[0] ?? "";
  if (!/^[A-Za-zÀ-ÿ'-]{2,}$/.test(firstToken)) {
    return null;
  }
  return firstToken;
}

function getUserFirstName(user: Awaited<ReturnType<typeof getUser>>) {
  const metadata = user?.user_metadata;
  const firstName = normalizeFirstName(
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : null,
  );

  return firstName ?? "there";
}

export default async function ReturningHomePage() {
  const user = await getUser();
  const [todayResult, activeSession, recentTasksResult, settingsResult] = await Promise.all([
    getTodayTasks(),
    getActiveSession(),
    getTasks({ status: "active", limit: 3 }),
    getUserSettings(),
  ]);

  const today = todayResult.success
    ? todayResult.data.today
    : new Date().toISOString().slice(0, 10);
  const tasks = todayResult.success ? todayResult.data.tasks : [];
  const tasksError = todayResult.success ? null : todayResult.error;
  const recentTasks = recentTasksResult.success ? recentTasksResult.data.tasks : [];
  const recentTask =
    recentTasks.find((task) => task.title.trim().length > 1) ?? null;
  const timeZone = settingsResult.success ? settingsResult.data.timezone : "Africa/Casablanca";
  const greeting = getGreetingForTimeZone(timeZone);
  const firstName = getUserFirstName(user);
  const continueHref = activeSession ? "/focus" : "/today";

  return (
    <div className="page-content-column space-y-8">
      <section className="space-y-3">
        <p className="text-overline">Home</p>
        <div className="space-y-2">
          <h1 className={`${dmSerif.className} text-[28px] leading-tight text-foreground`}>
            {greeting}, {firstName}
          </h1>
          <p className={`${dmSerif.className} text-lg text-muted-foreground`}>
            {formatLongDateLabel(today)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Continue</h2>
            <p className="text-sm text-muted-foreground">
              Pick up the thread you touched most recently.
            </p>
          </div>
          {activeSession ? (
            <Link href="/focus" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <IconFocus className="h-4 w-4" aria-hidden="true" />
              Open running session
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {recentTask ? (
            <Link
              href={continueHref}
              className="ui-hover focus-ring inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-foreground"
            >
              <IconTasks className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{recentTask.title}</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-4 py-2 text-sm text-muted-foreground"
            >
              <IconTasks className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>No recent task yet</span>
            </button>
          )}

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border/70 bg-muted/40 px-4 py-2 text-sm text-muted-foreground"
          >
            <IconSparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Last note placeholder</span>
          </button>
        </div>
      </section>

      <section className="group relative space-y-5 rounded-[28px] border border-border/70 bg-card/50 px-4 py-5 shadow-[var(--shadow-soft)] sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Today&apos;s work</h2>
            <p className="text-sm text-muted-foreground">
              The shortest path back into what matters right now.
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {tasksError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {tasksError}
          </p>
        ) : tasks.length === 0 ? (
          <p className={`${dmSerif.className} py-8 text-center text-xl text-muted-foreground`}>
            Nothing scheduled. Good time to plan.
          </p>
        ) : (
          <TaskList
            tasks={tasks}
            projects={[]}
            showQueueSection={false}
            showListHeader={false}
            allowInlineCreate={false}
          />
        )}

        <div className="pt-2">
          <HomeQuickCreate today={today} />
        </div>
      </section>
    </div>
  );
}
