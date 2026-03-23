import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toSettingsAutomationResponse,
} from "../../lib/automation/settings-route.ts";
import {
  normalizeTimezone,
  settingsAgentPatchSchema,
} from "../../lib/validation/settings.schema.ts";

describe("agent settings validation", () => {
  it("normalizes known timezones using the shared settings list", () => {
    assert.equal(normalizeTimezone(" utc "), "UTC");
    assert.equal(normalizeTimezone("america/new_york"), "America/New_York");
    assert.equal(normalizeTimezone("Mars/Olympus"), null);
  });

  it("rejects unsupported settings fields", () => {
    const parsed = settingsAgentPatchSchema.safeParse({
      pomodoro_v2_enabled: true,
    });

    assert.equal(parsed.success, false);
  });

  it("rejects invalid timezone values", () => {
    const parsed = settingsAgentPatchSchema.safeParse({
      timezone: "Mars/Olympus",
    });

    assert.equal(parsed.success, false);
  });
});

describe("agent settings response mapping", () => {
  it("returns only allowed settings fields", async () => {
    const response = toSettingsAutomationResponse({
      success: true,
      data: {
        timezone: "UTC",
        default_task_id: "task-1",
        pomodoro_work_minutes: 50,
        pomodoro_short_break_minutes: 10,
        pomodoro_long_break_minutes: 20,
        pomodoro_long_break_every: 4,
        pomodoro_v2_enabled: true,
        auto_archive_completed: true,
      },
    });
    const body = await response.json();

    assert.deepEqual(body.data, {
      timezone: "UTC",
      pomodoroWorkMinutes: 50,
      pomodoroShortBreakMinutes: 10,
      pomodoroLongBreakMinutes: 20,
      pomodoroLongBreakEvery: 4,
      autoArchiveCompleted: true,
      defaultTaskId: "task-1",
    });
    assert.equal("pomodoro_v2_enabled" in body.data, false);
  });

  it("maps service validation failures to bad_request", async () => {
    const response = toSettingsAutomationResponse({
      success: false,
      error: "Timezone is invalid.",
      code: "validation_error",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "bad_request");
  });
});
