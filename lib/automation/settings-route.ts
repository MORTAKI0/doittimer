import { z } from "zod";

import {
  getAutomationRouteContext,
  parseJsonBody,
} from "@/lib/automation/task-route";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";
import type {
  ServiceResult,
  UserSettings,
} from "@/lib/services/settings";
import { settingsAgentPatchSchema } from "@/lib/validation/settings.schema";

export type SettingsAgentPatchBody = z.infer<typeof settingsAgentPatchSchema>;

export function toAgentSettings(settings: UserSettings) {
  return {
    timezone: settings.timezone,
    pomodoroWorkMinutes: settings.pomodoro_work_minutes,
    pomodoroShortBreakMinutes: settings.pomodoro_short_break_minutes,
    pomodoroLongBreakMinutes: settings.pomodoro_long_break_minutes,
    pomodoroLongBreakEvery: settings.pomodoro_long_break_every,
    autoArchiveCompleted: settings.auto_archive_completed,
    defaultTaskId: settings.default_task_id,
  };
}

export function toSettingsAutomationResponse(result: ServiceResult<UserSettings>) {
  if (result.success) {
    return successResponse(toAgentSettings(result.data));
  }

  if (result.code === "validation_error") {
    return errorResponse(AUTOMATION_ERROR_CODES.badRequest, result.error, 400);
  }

  return errorResponse(AUTOMATION_ERROR_CODES.internalError, result.error, 500);
}

export { getAutomationRouteContext, parseJsonBody, settingsAgentPatchSchema };
