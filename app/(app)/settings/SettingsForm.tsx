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
import {
  DEFAULT_FOCUS_INTERVAL_MINUTES,
  FOCUS_INTERVAL_MAX,
  FOCUS_INTERVAL_MIN,
  FOCUS_INTERVAL_STORAGE_KEY,
  normalizeFocusIntervalMinutes,
} from "@/lib/focusInterval";

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
  intervalBell: number;
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

function sameServerSettings(a: DraftSettings, b: DraftSettings) {
  return (
    a.timezone === b.timezone &&
    a.defaultTaskId === b.defaultTaskId &&
    a.work === b.work &&
    a.shortBreak === b.shortBreak &&
    a.longBreak === b.longBreak &&
    a.longEvery === b.longEvery &&
    a.autoArchive === b.autoArchive
  );
}

function readStoredIntervalBellMinutes() {
  try {
    const stored = window.localStorage.getItem(FOCUS_INTERVAL_STORAGE_KEY);
    if (!stored) return DEFAULT_FOCUS_INTERVAL_MINUTES;
    return normalizeFocusIntervalMinutes(stored);
  } catch {
    return DEFAULT_FOCUS_INTERVAL_MINUTES;
  }
}

function toDraft(props: SettingsFormProps): DraftSettings {
  return {
    timezone: props.initialTimezone,
    defaultTaskId: props.initialDefaultTaskId ?? "",
    work: props.initialPomodoroWorkMinutes,
    shortBreak: props.initialPomodoroShortBreakMinutes,
    longBreak: props.initialPomodoroLongBreakMinutes,
    longEvery: props.initialPomodoroLongBreakEvery,
    autoArchive: props.initialAutoArchiveCompleted,
    intervalBell: DEFAULT_FOCUS_INTERVAL_MINUTES,
  };
}

function sameSettings(a: DraftSettings, b: DraftSettings) {
  return (
    a.timezone === b.timezone &&
    a.defaultTaskId === b.defaultTaskId &&
    a.work === b.work &&
    a.shortBreak === b.shortBreak &&
    a.longBreak === b.longBreak &&
    a.longEvery === b.longEvery &&
    a.autoArchive === b.autoArchive &&
    a.intervalBell === b.intervalBell
  );
}

function validateDraft(
  draft: DraftSettings,
): { ok: true } | { ok: false; message: string } {
  if (draft.timezone.trim().length === 0) {
    return { ok: false, message: "Timezone is required." };
  }
  if (
    draft.work < WORK_MINUTES_RANGE.min ||
    draft.work > WORK_MINUTES_RANGE.max
  ) {
    return {
      ok: false,
      message: `Work minutes must be between ${WORK_MINUTES_RANGE.min} and ${WORK_MINUTES_RANGE.max}.`,
    };
  }
  if (
    draft.shortBreak < SHORT_BREAK_RANGE.min ||
    draft.shortBreak > SHORT_BREAK_RANGE.max
  ) {
    return {
      ok: false,
      message: `Short break must be between ${SHORT_BREAK_RANGE.min} and ${SHORT_BREAK_RANGE.max}.`,
    };
  }
  if (
    draft.longBreak < LONG_BREAK_RANGE.min ||
    draft.longBreak > LONG_BREAK_RANGE.max
  ) {
    return {
      ok: false,
      message: `Long break must be between ${LONG_BREAK_RANGE.min} and ${LONG_BREAK_RANGE.max}.`,
    };
  }
  if (
    draft.longEvery < LONG_BREAK_EVERY_RANGE.min ||
    draft.longEvery > LONG_BREAK_EVERY_RANGE.max
  ) {
    return {
      ok: false,
      message: `Long break every must be between ${LONG_BREAK_EVERY_RANGE.min} and ${LONG_BREAK_EVERY_RANGE.max}.`,
    };
  }
  if (
    draft.intervalBell < FOCUS_INTERVAL_MIN ||
    draft.intervalBell > FOCUS_INTERVAL_MAX
  ) {
    return {
      ok: false,
      message: `Interval bell must be between ${FOCUS_INTERVAL_MIN} and ${FOCUS_INTERVAL_MAX} minutes.`,
    };
  }
  return { ok: true };
}

/** User settings form with debounced autosave and range-safe validation. */
export function SettingsForm(props: SettingsFormProps) {
  const { tasks } = props;
  const router = useRouter();
  const { pushToast } = useToast();
  const [draft, setDraft] = React.useState<DraftSettings>(() => toDraft(props));
  const [lastSaved, setLastSaved] = React.useState<DraftSettings>(() =>
    toDraft(props),
  );
  const [isPending, setIsPending] = React.useState(false);

  const isDirty = !sameSettings(draft, lastSaved);

  React.useEffect(() => {
    const storedMinutes = readStoredIntervalBellMinutes();
    setDraft((prev) => ({ ...prev, intervalBell: storedMinutes }));
    setLastSaved((prev) => ({ ...prev, intervalBell: storedMinutes }));
  }, []);

  async function persistSettings(source: "auto" | "manual") {
    const validation = validateDraft(draft);
    if (!validation.ok) {
      if (source === "manual") {
        pushToast({
          title: "Save failed",
          description: validation.message,
          variant: "error",
        });
      }
      return;
    }

    setIsPending(true);
    const normalizedDefaultTaskId =
      draft.defaultTaskId.trim() !== "" ? draft.defaultTaskId : null;
    const hasServerDiff = !sameServerSettings(draft, lastSaved);

    try {
      if (hasServerDiff) {
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
      }

      window.localStorage.setItem(
        FOCUS_INTERVAL_STORAGE_KEY,
        String(normalizeFocusIntervalMinutes(draft.intervalBell)),
      );

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
            intervalBell: draft.intervalBell,
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

      const message =
        error instanceof Error
          ? error.message
          : "Unable to save settings. Please try again.";
      pushToast({
        title: "Save failed",
        description: message,
        variant: "error",
      });
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
          <span className="text-foreground text-sm font-medium">Timezone</span>
          <Select
            id="timezone"
            name="timezone"
            value={draft.timezone}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, timezone: event.target.value }))
            }
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-foreground text-sm font-medium">
            Default task
          </span>
          <Select
            id="default-task"
            name="default-task"
            value={draft.defaultTaskId}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                defaultTaskId: event.target.value,
              }))
            }
            disabled={tasks.length === 0}
          >
            <option value="">No default task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Create a task to set a default.
            </p>
          ) : null}
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-foreground text-sm font-medium">
          Pomodoro durations
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-foreground space-y-1 text-sm">
            <span>Work minutes</span>
            <Input
              type="number"
              min={WORK_MINUTES_RANGE.min}
              max={WORK_MINUTES_RANGE.max}
              step={1}
              value={draft.work}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  work: Number(event.target.value) || 0,
                }))
              }
              disabled={isPending}
              required
            />
          </label>
          <label className="text-foreground space-y-1 text-sm">
            <span>Short break minutes</span>
            <Input
              type="number"
              min={SHORT_BREAK_RANGE.min}
              max={SHORT_BREAK_RANGE.max}
              step={1}
              value={draft.shortBreak}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  shortBreak: Number(event.target.value) || 0,
                }))
              }
              disabled={isPending}
              required
            />
          </label>
          <label className="text-foreground space-y-1 text-sm">
            <span>Long break minutes</span>
            <Input
              type="number"
              min={LONG_BREAK_RANGE.min}
              max={LONG_BREAK_RANGE.max}
              step={1}
              value={draft.longBreak}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  longBreak: Number(event.target.value) || 0,
                }))
              }
              disabled={isPending}
              required
            />
          </label>
          <label className="text-foreground space-y-1 text-sm">
            <span>Long break every</span>
            <Input
              type="number"
              min={LONG_BREAK_EVERY_RANGE.min}
              max={LONG_BREAK_EVERY_RANGE.max}
              step={1}
              value={draft.longEvery}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  longEvery: Number(event.target.value) || 0,
                }))
              }
              disabled={isPending}
              required
            />
          </label>
        </div>
        <p className="text-muted-foreground text-xs">
          Long break every = number of work sessions before a long break.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-foreground text-sm font-medium">
          Interval reminders
        </p>
        <label className="text-foreground space-y-1 text-sm">
          <span>Interval bell (minutes)</span>
          <Input
            type="number"
            min={FOCUS_INTERVAL_MIN}
            max={FOCUS_INTERVAL_MAX}
            step={1}
            value={draft.intervalBell}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                intervalBell: Number(event.target.value) || 0,
              }))
            }
            disabled={isPending}
            required
          />
        </label>
      </div>

      <div className="border-border/70 space-y-2 rounded-xl border p-3">
        <p className="text-foreground text-sm font-medium">Task archiving</p>
        <label className="text-foreground flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.autoArchive}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                autoArchive: event.target.checked,
              }))
            }
            disabled={isPending}
            className="border-border focus-ring mt-0.5 h-4 w-4 rounded text-emerald-600"
          />
          <span>
            <span className="block font-medium">
              Auto-archive completed tasks
            </span>
            <span className="text-muted-foreground block text-xs">
              When enabled, completing a task moves it to archive automatically.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !isDirty}>
          Save now
        </Button>
        <p className="text-muted-foreground text-xs">
          {isPending
            ? "Saving..."
            : isDirty
              ? "Unsaved changes"
              : "All changes saved"}
        </p>
      </div>
    </form>
  );
}
