import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import {
  defaultTaskIdSchema,
  pomodoroLongBreakEverySchema,
  pomodoroLongBreakMinutesSchema,
  pomodoroShortBreakMinutesSchema,
  pomodoroWorkMinutesSchema,
  timezoneSchema,
} from "@/lib/validation/settings.schema";

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: "validation_error" | "internal_error" };

export type UserSettings = {
  timezone: string;
  default_task_id: string | null;
  pomodoro_work_minutes: number;
  pomodoro_short_break_minutes: number;
  pomodoro_long_break_minutes: number;
  pomodoro_long_break_every: number;
  pomodoro_v2_enabled: boolean;
  auto_archive_completed: boolean;
};

export type UserSettingsUpsertInput = {
  timezone?: string;
  defaultTaskId?: string | null;
  pomodoroWorkMinutes?: number;
  pomodoroShortBreakMinutes?: number;
  pomodoroLongBreakMinutes?: number;
  pomodoroLongBreakEvery?: number;
  autoArchiveCompleted?: boolean;
};

const USER_SETTINGS_SELECT = [
  "timezone",
  "default_task_id",
  "pomodoro_work_minutes",
  "pomodoro_short_break_minutes",
  "pomodoro_long_break_minutes",
  "pomodoro_long_break_every",
  "pomodoro_v2_enabled",
  "auto_archive_completed",
].join(", ");

const DEFAULT_USER_SETTINGS = {
  timezone: "Africa/Casablanca",
  pomodoro_work_minutes: 25,
  pomodoro_short_break_minutes: 5,
  pomodoro_long_break_minutes: 15,
  pomodoro_long_break_every: 4,
  pomodoro_v2_enabled: false,
  auto_archive_completed: false,
} as const;

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeSettingsRow(data: unknown): UserSettings | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const record = row as {
    timezone?: unknown;
    default_task_id?: unknown;
    pomodoro_work_minutes?: unknown;
    pomodoro_short_break_minutes?: unknown;
    pomodoro_long_break_minutes?: unknown;
    pomodoro_long_break_every?: unknown;
    pomodoro_v2_enabled?: unknown;
    auto_archive_completed?: unknown;
  };

  const timezone =
    typeof record.timezone === "string" && record.timezone.trim().length > 0
      ? record.timezone
      : DEFAULT_USER_SETTINGS.timezone;

  return {
    timezone,
    default_task_id:
      typeof record.default_task_id === "string" ? record.default_task_id : null,
    pomodoro_work_minutes:
      toInteger(record.pomodoro_work_minutes) ?? DEFAULT_USER_SETTINGS.pomodoro_work_minutes,
    pomodoro_short_break_minutes:
      toInteger(record.pomodoro_short_break_minutes) ??
      DEFAULT_USER_SETTINGS.pomodoro_short_break_minutes,
    pomodoro_long_break_minutes:
      toInteger(record.pomodoro_long_break_minutes) ??
      DEFAULT_USER_SETTINGS.pomodoro_long_break_minutes,
    pomodoro_long_break_every:
      toInteger(record.pomodoro_long_break_every) ??
      DEFAULT_USER_SETTINGS.pomodoro_long_break_every,
    pomodoro_v2_enabled:
      typeof record.pomodoro_v2_enabled === "boolean"
        ? record.pomodoro_v2_enabled
        : DEFAULT_USER_SETTINGS.pomodoro_v2_enabled,
    auto_archive_completed:
      typeof record.auto_archive_completed === "boolean"
        ? record.auto_archive_completed
        : DEFAULT_USER_SETTINGS.auto_archive_completed,
  };
}

async function usesUserScopedSession(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return false;
    return data.user?.id === userId;
  } catch {
    return false;
  }
}

async function ensureUserSettingsRowForUser(supabase: SupabaseClient, userId: string) {
  if (await usesUserScopedSession(supabase, userId)) {
    const { error } = await supabase.rpc("get_user_settings");
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    throw error;
  }
}

async function selectUserSettingsRow(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select(USER_SETTINGS_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeSettingsRow(data);
}

async function validateOwnedDefaultTaskId(
  supabase: SupabaseClient,
  userId: string,
  taskId: string | null,
) {
  if (!taskId) {
    return true;
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

export async function getUserSettingsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<UserSettings>> {
  try {
    await ensureUserSettingsRowForUser(supabase, userId);
    const settings = await selectUserSettingsRow(supabase, userId);

    if (!settings) {
      return { success: false, error: "Unable to load settings." };
    }

    return { success: true, data: settings };
  } catch (error) {
    logServerError({
      scope: "services.settings.getUserSettingsForUser",
      userId,
      error,
    });
    return { success: false, error: "Unable to load settings.", code: "internal_error" };
  }
}

export async function upsertUserSettingsForUser(
  supabase: SupabaseClient,
  userId: string,
  settings: UserSettingsUpsertInput,
): Promise<ServiceResult<UserSettings>> {
  const current = await getUserSettingsForUser(supabase, userId);
  if (!current.success) {
    return current;
  }

  const parsedTimezone =
    settings.timezone !== undefined
      ? timezoneSchema.safeParse(settings.timezone)
      : { success: true as const, data: current.data.timezone };
  const parsedDefaultTaskId =
    settings.defaultTaskId !== undefined
      ? defaultTaskIdSchema.safeParse(settings.defaultTaskId)
      : { success: true as const, data: current.data.default_task_id };
  const parsedPomodoroWorkMinutes =
    settings.pomodoroWorkMinutes !== undefined
      ? pomodoroWorkMinutesSchema.safeParse(settings.pomodoroWorkMinutes)
      : { success: true as const, data: current.data.pomodoro_work_minutes };
  const parsedPomodoroShortBreakMinutes =
    settings.pomodoroShortBreakMinutes !== undefined
      ? pomodoroShortBreakMinutesSchema.safeParse(settings.pomodoroShortBreakMinutes)
      : { success: true as const, data: current.data.pomodoro_short_break_minutes };
  const parsedPomodoroLongBreakMinutes =
    settings.pomodoroLongBreakMinutes !== undefined
      ? pomodoroLongBreakMinutesSchema.safeParse(settings.pomodoroLongBreakMinutes)
      : { success: true as const, data: current.data.pomodoro_long_break_minutes };
  const parsedPomodoroLongBreakEvery =
    settings.pomodoroLongBreakEvery !== undefined
      ? pomodoroLongBreakEverySchema.safeParse(settings.pomodoroLongBreakEvery)
      : { success: true as const, data: current.data.pomodoro_long_break_every };

  const validationError =
    (!parsedTimezone.success && parsedTimezone.error.issues[0]?.message) ||
    (!parsedDefaultTaskId.success && parsedDefaultTaskId.error.issues[0]?.message) ||
    (!parsedPomodoroWorkMinutes.success &&
      parsedPomodoroWorkMinutes.error.issues[0]?.message) ||
    (!parsedPomodoroShortBreakMinutes.success &&
      parsedPomodoroShortBreakMinutes.error.issues[0]?.message) ||
    (!parsedPomodoroLongBreakMinutes.success &&
      parsedPomodoroLongBreakMinutes.error.issues[0]?.message) ||
    (!parsedPomodoroLongBreakEvery.success &&
      parsedPomodoroLongBreakEvery.error.issues[0]?.message);

  if (validationError) {
    return {
      success: false,
      error: validationError,
      code: "validation_error",
    };
  }

  try {
    const defaultTaskId = parsedDefaultTaskId.data ?? null;
    const ownsDefaultTask = await validateOwnedDefaultTaskId(supabase, userId, defaultTaskId);

    if (!ownsDefaultTask) {
      return {
        success: false,
        error: "Invalid default task.",
        code: "validation_error",
      };
    }

    const nextAutoArchiveCompleted =
      settings.autoArchiveCompleted ?? current.data.auto_archive_completed;

    if (await usesUserScopedSession(supabase, userId)) {
      const { error } = await supabase.rpc("upsert_user_settings", {
        p_timezone: parsedTimezone.data,
        p_default_task_id: defaultTaskId,
        p_pomodoro_work_minutes: parsedPomodoroWorkMinutes.data,
        p_pomodoro_short_break_minutes: parsedPomodoroShortBreakMinutes.data,
        p_pomodoro_long_break_minutes: parsedPomodoroLongBreakMinutes.data,
        p_pomodoro_long_break_every: parsedPomodoroLongBreakEvery.data,
      });

      if (error) {
        throw error;
      }

      if (
        settings.autoArchiveCompleted !== undefined &&
        settings.autoArchiveCompleted !== current.data.auto_archive_completed
      ) {
        const { error: autoArchiveError } = await supabase
          .from("user_settings")
          .update({
            auto_archive_completed: nextAutoArchiveCompleted,
          })
          .eq("user_id", userId);

        if (autoArchiveError) {
          throw autoArchiveError;
        }
      }
    } else {
      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: userId,
          timezone: parsedTimezone.data,
          default_task_id: defaultTaskId,
          pomodoro_work_minutes: parsedPomodoroWorkMinutes.data,
          pomodoro_short_break_minutes: parsedPomodoroShortBreakMinutes.data,
          pomodoro_long_break_minutes: parsedPomodoroLongBreakMinutes.data,
          pomodoro_long_break_every: parsedPomodoroLongBreakEvery.data,
          auto_archive_completed: nextAutoArchiveCompleted,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) {
        throw error;
      }
    }

    const refreshed = await selectUserSettingsRow(supabase, userId);

    if (!refreshed) {
      return { success: false, error: "Unable to save settings.", code: "internal_error" };
    }

    return { success: true, data: refreshed };
  } catch (error) {
    logServerError({
      scope: "services.settings.upsertUserSettingsForUser",
      userId,
      error,
      context: settings,
    });
    return { success: false, error: "Unable to save settings.", code: "internal_error" };
  }
}
