// app/(app)/settings/SettingsForm.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  getUserSettings,
  updateAutoArchiveCompleted,
  upsertUserSettings,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";

type TaskOption = {
  id: string;
  title: string;
};

type SettingsFormProps = {
  initialTimezone: string;
  initialDefaultTaskId: string | null;
  initialPomodoroWorkMinutes: number;
  initialPomodoroShortBreakMinutes: number;
  initialPomodoroLongBreakMinutes: number;
  initialPomodoroLongBreakEvery: number;
  initialAutoArchiveCompleted: boolean;
  tasks: TaskOption[];
};

const TIMEZONE_OPTIONS = [
  "Africa/Casablanca",
  "UTC",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Tokyo",
];
const WORK_MINUTES_RANGE = { min: 1, max: 240 };
const SHORT_BREAK_RANGE = { min: 1, max: 60 };
const LONG_BREAK_RANGE = { min: 1, max: 120 };
const LONG_BREAK_EVERY_RANGE = { min: 1, max: 12 };

export function SettingsForm({
  initialTimezone,
  initialDefaultTaskId,
  initialPomodoroWorkMinutes,
  initialPomodoroShortBreakMinutes,
  initialPomodoroLongBreakMinutes,
  initialPomodoroLongBreakEvery,
  initialAutoArchiveCompleted,
  tasks,
}: SettingsFormProps) {
  const router = useRouter();
  const [timezone, setTimezone] = React.useState(initialTimezone);
  const [defaultTaskId, setDefaultTaskId] = React.useState(initialDefaultTaskId ?? "");
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = React.useState(
    initialPomodoroWorkMinutes,
  );
  const [pomodoroShortBreakMinutes, setPomodoroShortBreakMinutes] = React.useState(
    initialPomodoroShortBreakMinutes,
  );
  const [pomodoroLongBreakMinutes, setPomodoroLongBreakMinutes] = React.useState(
    initialPomodoroLongBreakMinutes,
  );
  const [pomodoroLongBreakEvery, setPomodoroLongBreakEvery] = React.useState(
    initialPomodoroLongBreakEvery,
  );
  const [autoArchiveCompleted, setAutoArchiveCompleted] = React.useState(
    initialAutoArchiveCompleted,
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const normalizedDefaultTaskId =
        defaultTaskId.trim() !== "" ? defaultTaskId : null;

      try {
        const [, autoArchiveResult] = await Promise.all([
          upsertUserSettings(
            timezone,
            normalizedDefaultTaskId,
            pomodoroWorkMinutes,
            pomodoroShortBreakMinutes,
            pomodoroLongBreakMinutes,
            pomodoroLongBreakEvery,
          ),
          updateAutoArchiveCompleted(autoArchiveCompleted),
        ]);

        if (!autoArchiveResult.success) {
          throw new Error(autoArchiveResult.error);
        }

        setIsError(false);
        setMessage("Settings saved.");
        router.refresh();
      } catch (error) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await getUserSettings();
          console.log("[settings] verification result", result);
          console.log("[settings] verification success", result.success);
          console.log("[settings] verification expected", {
            timezone,
            default_task_id: normalizedDefaultTaskId,
            pomodoro_work_minutes: pomodoroWorkMinutes,
            pomodoro_short_break_minutes: pomodoroShortBreakMinutes,
            pomodoro_long_break_minutes: pomodoroLongBreakMinutes,
            pomodoro_long_break_every: pomodoroLongBreakEvery,
            auto_archive_completed: autoArchiveCompleted,
          });
          if (result.success) {
            console.log("[settings] verification saved", result.data);
          }

          if (result.success) {
            const saved = result.data;
            const settingsMatch =
              saved.timezone === timezone
              && saved.default_task_id === normalizedDefaultTaskId
              && saved.pomodoro_work_minutes === pomodoroWorkMinutes
              && saved.pomodoro_short_break_minutes === pomodoroShortBreakMinutes
              && saved.pomodoro_long_break_minutes === pomodoroLongBreakMinutes
              && saved.pomodoro_long_break_every === pomodoroLongBreakEvery
              && saved.auto_archive_completed === autoArchiveCompleted;

            if (settingsMatch) {
              setIsError(false);
              setMessage("Settings saved.");
              router.refresh();
              return;
            }
          }
        } catch (verificationError) {
          console.error("[settings] verification failed", verificationError);
        }

        setIsError(true);
        router.refresh();
        const message = error instanceof Error ? error.message : "";
        setMessage(message || "Unable to save settings. Please try again.");
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="timezone">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="default-task">
          Default task
        </label>
        <select
          id="default-task"
          name="default-task"
          value={defaultTaskId}
          onChange={(event) => setDefaultTaskId(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
          disabled={tasks.length === 0}
        >
          <option value="">No default task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create a task to set a default.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Pomodoro durations</p>
        <p className="text-xs text-muted-foreground">
          Examples: 25/5 for classic focus, 50/10 for deep work.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-foreground">
            <span className="text-sm font-medium text-foreground">Work minutes</span>
            <input
              type="number"
              min={WORK_MINUTES_RANGE.min}
              max={WORK_MINUTES_RANGE.max}
              step={1}
              value={pomodoroWorkMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPomodoroWorkMinutes(Number.isFinite(next) ? next : 0);
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
              disabled={isPending}
              required
            />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span className="text-sm font-medium text-foreground">Short break minutes</span>
            <input
              type="number"
              min={SHORT_BREAK_RANGE.min}
              max={SHORT_BREAK_RANGE.max}
              step={1}
              value={pomodoroShortBreakMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPomodoroShortBreakMinutes(Number.isFinite(next) ? next : 0);
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
              disabled={isPending}
              required
            />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span className="text-sm font-medium text-foreground">Long break minutes</span>
            <input
              type="number"
              min={LONG_BREAK_RANGE.min}
              max={LONG_BREAK_RANGE.max}
              step={1}
              value={pomodoroLongBreakMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPomodoroLongBreakMinutes(Number.isFinite(next) ? next : 0);
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
              disabled={isPending}
              required
            />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span className="text-sm font-medium text-foreground">
              Long break every
            </span>
            <input
              type="number"
              min={LONG_BREAK_EVERY_RANGE.min}
              max={LONG_BREAK_EVERY_RANGE.max}
              step={1}
              value={pomodoroLongBreakEvery}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPomodoroLongBreakEvery(Number.isFinite(next) ? next : 0);
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
              disabled={isPending}
              required
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Long break every = number of work sessions before a long break.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border/70 p-3">
        <p className="text-sm font-medium text-foreground">Task archiving</p>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={autoArchiveCompleted}
            onChange={(event) => setAutoArchiveCompleted(event.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          />
          <span>
            <span className="block font-medium">Auto-archive completed tasks</span>
            <span className="block text-xs text-muted-foreground">
              When enabled, completing a task moves it to archive automatically.
            </span>
          </span>
        </label>
      </div>

      {message ? (
        <p
          className={
            isError
              ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
