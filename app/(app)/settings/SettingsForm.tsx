"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  getUserSettings,
  updateAutoArchiveCompleted,
  upsertUserSettings,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

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

type DraftSettings = {
  timezone: string;
  defaultTaskId: string;
  work: number;
  shortBreak: number;
  longBreak: number;
  longEvery: number;
  autoArchive: boolean;
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

function toDraft(props: SettingsFormProps): DraftSettings {
  return {
    timezone: props.initialTimezone,
    defaultTaskId: props.initialDefaultTaskId ?? "",
    work: props.initialPomodoroWorkMinutes,
    shortBreak: props.initialPomodoroShortBreakMinutes,
    longBreak: props.initialPomodoroLongBreakMinutes,
    longEvery: props.initialPomodoroLongBreakEvery,
    autoArchive: props.initialAutoArchiveCompleted,
  };
}

function sameSettings(a: DraftSettings, b: DraftSettings) {
  return (
    a.timezone === b.timezone
    && a.defaultTaskId === b.defaultTaskId
    && a.work === b.work
    && a.shortBreak === b.shortBreak
    && a.longBreak === b.longBreak
    && a.longEvery === b.longEvery
    && a.autoArchive === b.autoArchive
  );
}

function validateDraft(draft: DraftSettings): { ok: true } | { ok: false; message: string } {
  if (draft.timezone.trim().length === 0) {
    return { ok: false, message: "Timezone is required." };
  }
  if (draft.work < WORK_MINUTES_RANGE.min || draft.work > WORK_MINUTES_RANGE.max) {
    return { ok: false, message: `Work minutes must be between ${WORK_MINUTES_RANGE.min} and ${WORK_MINUTES_RANGE.max}.` };
  }
  if (draft.shortBreak < SHORT_BREAK_RANGE.min || draft.shortBreak > SHORT_BREAK_RANGE.max) {
    return { ok: false, message: `Short break must be between ${SHORT_BREAK_RANGE.min} and ${SHORT_BREAK_RANGE.max}.` };
  }
  if (draft.longBreak < LONG_BREAK_RANGE.min || draft.longBreak > LONG_BREAK_RANGE.max) {
    return { ok: false, message: `Long break must be between ${LONG_BREAK_RANGE.min} and ${LONG_BREAK_RANGE.max}.` };
  }
  if (draft.longEvery < LONG_BREAK_EVERY_RANGE.min || draft.longEvery > LONG_BREAK_EVERY_RANGE.max) {
    return { ok: false, message: `Long break every must be between ${LONG_BREAK_EVERY_RANGE.min} and ${LONG_BREAK_EVERY_RANGE.max}.` };
  }
  return { ok: true };
}

/** User settings form with debounced autosave and range-safe validation. */
export function SettingsForm(props: SettingsFormProps) {
  const { tasks } = props;
  const router = useRouter();
  const { pushToast } = useToast();
  const [draft, setDraft] = React.useState<DraftSettings>(() => toDraft(props));
  const [lastSaved, setLastSaved] = React.useState<DraftSettings>(() => toDraft(props));
  const [isPending, setIsPending] = React.useState(false);

  const isDirty = !sameSettings(draft, lastSaved);

  async function persistSettings(source: "auto" | "manual") {
    const validation = validateDraft(draft);
    if (!validation.ok) {
      if (source === "manual") {
        pushToast({ title: "Save failed", description: validation.message, variant: "error" });
      }
      return;
    }

    setIsPending(true);
    const normalizedDefaultTaskId = draft.defaultTaskId.trim() !== "" ? draft.defaultTaskId : null;

    try {
      const [, autoArchiveResult] = await Promise.all([
        upsertUserSettings(
          draft.timezone,
          normalizedDefaultTaskId,
          draft.work,
          draft.shortBreak,
          draft.longBreak,
          draft.longEvery,
        ),
        updateAutoArchiveCompleted(draft.autoArchive),
      ]);

      if (!autoArchiveResult.success) {
        throw new Error(autoArchiveResult.error);
      }

      setLastSaved(draft);
      pushToast({
        title: source === "auto" ? "Settings auto-saved" : "Settings saved",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      try {
        const result = await getUserSettings();
        if (result.success) {
          const saved: DraftSettings = {
            timezone: result.data.timezone,
            defaultTaskId: result.data.default_task_id ?? "",
            work: result.data.pomodoro_work_minutes,
            shortBreak: result.data.pomodoro_short_break_minutes,
            longBreak: result.data.pomodoro_long_break_minutes,
            longEvery: result.data.pomodoro_long_break_every,
            autoArchive: result.data.auto_archive_completed,
          };

          if (sameSettings(saved, draft)) {
            setLastSaved(saved);
            pushToast({ title: "Settings saved", variant: "success" });
            router.refresh();
            setIsPending(false);
            return;
          }
        }
      } catch {}

      const message = error instanceof Error ? error.message : "Unable to save settings. Please try again.";
      pushToast({ title: "Save failed", description: message, variant: "error" });
    }

    setIsPending(false);
  }

  React.useEffect(() => {
    if (!isDirty) return;

    const handle = window.setTimeout(() => {
      void persistSettings("auto");
    }, 900);

    return () => window.clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void persistSettings("manual");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground">Timezone</span>
          <Select id="timezone" name="timezone" value={draft.timezone} onChange={(event) => setDraft((prev) => ({ ...prev, timezone: event.target.value }))}>
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground">Default task</span>
          <Select
            id="default-task"
            name="default-task"
            value={draft.defaultTaskId}
            onChange={(event) => setDraft((prev) => ({ ...prev, defaultTaskId: event.target.value }))}
            disabled={tasks.length === 0}
          >
            <option value="">No default task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </Select>
          {tasks.length === 0 ? <p className="text-xs text-muted-foreground">Create a task to set a default.</p> : null}
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Pomodoro durations</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-foreground">
            <span>Work minutes</span>
            <Input type="number" min={WORK_MINUTES_RANGE.min} max={WORK_MINUTES_RANGE.max} step={1} value={draft.work} onChange={(event) => setDraft((prev) => ({ ...prev, work: Number(event.target.value) || 0 }))} disabled={isPending} required />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span>Short break minutes</span>
            <Input type="number" min={SHORT_BREAK_RANGE.min} max={SHORT_BREAK_RANGE.max} step={1} value={draft.shortBreak} onChange={(event) => setDraft((prev) => ({ ...prev, shortBreak: Number(event.target.value) || 0 }))} disabled={isPending} required />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span>Long break minutes</span>
            <Input type="number" min={LONG_BREAK_RANGE.min} max={LONG_BREAK_RANGE.max} step={1} value={draft.longBreak} onChange={(event) => setDraft((prev) => ({ ...prev, longBreak: Number(event.target.value) || 0 }))} disabled={isPending} required />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            <span>Long break every</span>
            <Input type="number" min={LONG_BREAK_EVERY_RANGE.min} max={LONG_BREAK_EVERY_RANGE.max} step={1} value={draft.longEvery} onChange={(event) => setDraft((prev) => ({ ...prev, longEvery: Number(event.target.value) || 0 }))} disabled={isPending} required />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Long break every = number of work sessions before a long break.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 p-3">
        <p className="text-sm font-medium text-foreground">Task archiving</p>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.autoArchive}
            onChange={(event) => setDraft((prev) => ({ ...prev, autoArchive: event.target.checked }))}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus-ring"
          />
          <span>
            <span className="block font-medium">Auto-archive completed tasks</span>
            <span className="block text-xs text-muted-foreground">When enabled, completing a task moves it to archive automatically.</span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !isDirty}>
          Save now
        </Button>
        <p className="text-xs text-muted-foreground">
          {isPending ? "Saving..." : isDirty ? "Unsaved changes" : "All changes saved"}
        </p>
      </div>
    </form>
  );
}

