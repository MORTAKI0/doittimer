import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  pomodoroPresets,
  presetToOverrides,
  type PomodoroPresetId,
  type TaskPomodoroOverrides,
} from "@/lib/pomodoro/presets";
import { taskPomodoroOverridesSchema } from "@/lib/validation/task.schema";

describe("pomodoro presets", () => {
  const expectedById: Record<PomodoroPresetId, TaskPomodoroOverrides> = {
    classic: {
      pomodoro_work_minutes: 25,
      pomodoro_short_break_minutes: 5,
      pomodoro_long_break_minutes: 15,
      pomodoro_long_break_every: 4,
    },
    deep_work: {
      pomodoro_work_minutes: 50,
      pomodoro_short_break_minutes: 10,
      pomodoro_long_break_minutes: 20,
      pomodoro_long_break_every: 2,
    },
    sprint: {
      pomodoro_work_minutes: 15,
      pomodoro_short_break_minutes: 3,
      pomodoro_long_break_minutes: 10,
      pomodoro_long_break_every: 4,
    },
  };

  for (const preset of pomodoroPresets) {
    it(`maps ${preset.label} to override payload`, () => {
      const overrides = presetToOverrides(preset);
      assert.deepEqual(overrides, expectedById[preset.id]);
      assert.doesNotThrow(() => {
        taskPomodoroOverridesSchema.parse({
          workMinutes: overrides.pomodoro_work_minutes,
          shortBreakMinutes: overrides.pomodoro_short_break_minutes,
          longBreakMinutes: overrides.pomodoro_long_break_minutes,
          longBreakEvery: overrides.pomodoro_long_break_every,
        });
      });
    });
  }
});
