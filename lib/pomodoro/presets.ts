import { taskPomodoroOverridesSchema } from "@/lib/validation/task.schema";

export type PomodoroPresetId = "classic" | "deep_work" | "sprint";

export type PomodoroPreset = {
  id: PomodoroPresetId;
  label: string;
  description: string;
  overrides: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longEvery: number;
  };
};

export type TaskPomodoroOverrides = {
  pomodoro_work_minutes: number | null;
  pomodoro_short_break_minutes: number | null;
  pomodoro_long_break_minutes: number | null;
  pomodoro_long_break_every: number | null;
};

export const pomodoroPresets: readonly PomodoroPreset[] = [
  {
    id: "classic",
    label: "Classic",
    description: "25/5 · long 15 · every 4",
    overrides: { work: 25, shortBreak: 5, longBreak: 15, longEvery: 4 },
  },
  {
    id: "deep_work",
    label: "Deep Work",
    description: "50/10 · long 20 · every 2",
    overrides: { work: 50, shortBreak: 10, longBreak: 20, longEvery: 2 },
  },
  {
    id: "sprint",
    label: "Sprint",
    description: "15/3 · long 10 · every 4",
    overrides: { work: 15, shortBreak: 3, longBreak: 10, longEvery: 4 },
  },
];

export function presetToOverrides(preset: PomodoroPreset): TaskPomodoroOverrides {
  const parsed = taskPomodoroOverridesSchema.parse({
    workMinutes: preset.overrides.work,
    shortBreakMinutes: preset.overrides.shortBreak,
    longBreakMinutes: preset.overrides.longBreak,
    longBreakEvery: preset.overrides.longEvery,
  });

  return {
    pomodoro_work_minutes: parsed.workMinutes,
    pomodoro_short_break_minutes: parsed.shortBreakMinutes,
    pomodoro_long_break_minutes: parsed.longBreakMinutes,
    pomodoro_long_break_every: parsed.longBreakEvery,
  };
}
