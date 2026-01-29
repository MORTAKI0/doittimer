// file: app/actions/settings.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { taskIdSchema } from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type UserSettings = {
  timezone: string;
  default_task_id: string | null;
  pomodoro_work_minutes: number;
  pomodoro_short_break_minutes: number;
  pomodoro_long_break_minutes: number;
  pomodoro_long_break_every: number;
  pomodoro_v2_enabled: boolean;
};

const timezoneSchema = z.string().min(1);
const defaultTaskSchema = taskIdSchema.nullable().optional();
const pomodoroWorkSchema = z.coerce.number().int().min(1).max(240);
const pomodoroShortBreakSchema = z.coerce.number().int().min(1).max(60);
const pomodoroLongBreakSchema = z.coerce.number().int().min(1).max(120);
const pomodoroLongBreakEverySchema = z.coerce.number().int().min(1).max(12);

const DEFAULT_POMODORO_SETTINGS = {
  pomodoro_work_minutes: 25,
  pomodoro_short_break_minutes: 5,
  pomodoro_long_break_minutes: 15,
  pomodoro_long_break_every: 4,
};

function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("fetch failed")
    || message.includes("timeout")
    || message.includes("connect")
    || message.includes("und_err_connect_timeout")
  );
}

async function rpcUpsertWithRetry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: {
    p_timezone: string;
    p_default_task_id: string | null;
    p_pomodoro_work_minutes: number;
    p_pomodoro_short_break_minutes: number;
    p_pomodoro_long_break_minutes: number;
    p_pomodoro_long_break_every: number;
  },
  reqId: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const attemptStartMs = Date.now();
    const timeoutMs = Number(process.env.SETTINGS_RPC_DIAG_TIMEOUT_MS || 0);
    let loggedAttemptError = false;

    console.log("[settings] rpc attempt start", {
      reqId,
      attempt,
      tsMs: attemptStartMs,
      timeoutMs: timeoutMs > 0 ? timeoutMs : null,
    });

    try {
      const rpcPromise = supabase.rpc("upsert_user_settings", args);
      const timeoutPromise = timeoutMs > 0
        ? new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`RPC diagnostic timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        })
        : null;
      const result = timeoutPromise
        ? await Promise.race([rpcPromise, timeoutPromise])
        : await rpcPromise;
      const { error } = result as { error?: { message: string; code?: string | null } | null };

      if (error) {
        loggedAttemptError = true;
        logServerError({
          scope: "actions.settings.rpcUpsertWithRetry",
          reqId,
          error,
          context: {
            attempt,
            rpc: "upsert_user_settings",
          },
        });
        throw new Error(error.message);
      }

      const attemptEndMs = Date.now();
      console.log("[settings] rpc attempt end", {
        reqId,
        attempt,
        tsMs: attemptEndMs,
        durationMs: attemptEndMs - attemptStartMs,
      });
      return;
    } catch (err) {
      if (!loggedAttemptError) {
        logServerError({
          scope: "actions.settings.rpcUpsertWithRetry",
          reqId,
          error: err,
          context: {
            attempt,
            rpc: "upsert_user_settings",
          },
        });
      }
      const attemptEndMs = Date.now();
      console.log("[settings] rpc attempt end", {
        reqId,
        attempt,
        tsMs: attemptEndMs,
        durationMs: attemptEndMs - attemptStartMs,
      });
      if (isTransientNetworkError(err) && attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      throw err;
    }
  }
}

function normalizeSettings(data: unknown): UserSettings | null {
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
  };
  const timezone = typeof record.timezone === "string" ? record.timezone : null;
  const defaultTaskId = typeof record.default_task_id === "string"
    ? record.default_task_id
    : null;
  const pomodoroWorkMinutes = toInteger(record.pomodoro_work_minutes)
    ?? DEFAULT_POMODORO_SETTINGS.pomodoro_work_minutes;
  const pomodoroShortBreakMinutes = toInteger(record.pomodoro_short_break_minutes)
    ?? DEFAULT_POMODORO_SETTINGS.pomodoro_short_break_minutes;
  const pomodoroLongBreakMinutes = toInteger(record.pomodoro_long_break_minutes)
    ?? DEFAULT_POMODORO_SETTINGS.pomodoro_long_break_minutes;
  const pomodoroLongBreakEvery = toInteger(record.pomodoro_long_break_every)
    ?? DEFAULT_POMODORO_SETTINGS.pomodoro_long_break_every;
  const pomodoroV2Enabled = typeof record.pomodoro_v2_enabled === "boolean"
    ? record.pomodoro_v2_enabled
    : false;

  if (!timezone) return null;

  return {
    timezone,
    default_task_id: defaultTaskId,
    pomodoro_work_minutes: pomodoroWorkMinutes,
    pomodoro_short_break_minutes: pomodoroShortBreakMinutes,
    pomodoro_long_break_minutes: pomodoroLongBreakMinutes,
    pomodoro_long_break_every: pomodoroLongBreakEvery,
    pomodoro_v2_enabled: pomodoroV2Enabled,
  };
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data, error } = await supabase.rpc("get_user_settings");

    if (error) {
      logServerError({
        scope: "actions.settings.getUserSettings",
        error,
        context: {
          rpc: "get_user_settings",
        },
      });
      return { success: false, error: "Unable to load settings." };
    }

    const settings = normalizeSettings(data);

    if (!settings) {
      return { success: false, error: "Unable to load settings." };
    }

    return { success: true, data: settings };
  } catch (error) {
    logServerError({
      scope: "actions.settings.getUserSettings",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export async function upsertUserSettings(
  timezone: string,
  defaultTaskId?: string | null,
  pomodoroWorkMinutes = DEFAULT_POMODORO_SETTINGS.pomodoro_work_minutes,
  pomodoroShortBreakMinutes = DEFAULT_POMODORO_SETTINGS.pomodoro_short_break_minutes,
  pomodoroLongBreakMinutes = DEFAULT_POMODORO_SETTINGS.pomodoro_long_break_minutes,
  pomodoroLongBreakEvery = DEFAULT_POMODORO_SETTINGS.pomodoro_long_break_every,
): Promise<void> {
  const reqId = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  const normalizedTimezone = (timezone ?? "").trim() || "Africa/Casablanca";
  const normalizedDefaultTaskId =
    defaultTaskId && defaultTaskId.trim() !== "" ? defaultTaskId : null;
  const normalizedPomodoroWorkMinutes = pomodoroWorkMinutes;
  const normalizedPomodoroShortBreakMinutes = pomodoroShortBreakMinutes;
  const normalizedPomodoroLongBreakMinutes = pomodoroLongBreakMinutes;
  const normalizedPomodoroLongBreakEvery = pomodoroLongBreakEvery;
  const parsedTimezone = timezoneSchema.safeParse(normalizedTimezone);
  const parsedDefaultTaskId = defaultTaskSchema.safeParse(normalizedDefaultTaskId);
  const parsedPomodoroWorkMinutes = pomodoroWorkSchema.safeParse(normalizedPomodoroWorkMinutes);
  const parsedPomodoroShortBreakMinutes =
    pomodoroShortBreakSchema.safeParse(normalizedPomodoroShortBreakMinutes);
  const parsedPomodoroLongBreakMinutes =
    pomodoroLongBreakSchema.safeParse(normalizedPomodoroLongBreakMinutes);
  const parsedPomodoroLongBreakEvery =
    pomodoroLongBreakEverySchema.safeParse(normalizedPomodoroLongBreakEvery);

  if (!parsedTimezone.success) {
    throw new Error("Invalid timezone.");
  }

  if (!parsedDefaultTaskId.success) {
    throw new Error("Invalid default task.");
  }

  if (
    !parsedPomodoroWorkMinutes.success
    || !parsedPomodoroShortBreakMinutes.success
    || !parsedPomodoroLongBreakMinutes.success
    || !parsedPomodoroLongBreakEvery.success
  ) {
    throw new Error("Invalid pomodoro settings.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  console.error("[settings] auth.getUser result", {
    reqId,
    hasUser: Boolean(userData?.user),
    userError: userError?.message ?? null,
  });

  if (userError || !userData.user) {
    throw new Error("You must be signed in.");
  }

  console.error("[settings] upsert payload", {
    reqId,
    p_timezone: parsedTimezone.data,
    p_default_task_id: parsedDefaultTaskId.data ?? null,
    p_pomodoro_work_minutes: parsedPomodoroWorkMinutes.data,
    p_pomodoro_short_break_minutes: parsedPomodoroShortBreakMinutes.data,
    p_pomodoro_long_break_minutes: parsedPomodoroLongBreakMinutes.data,
    p_pomodoro_long_break_every: parsedPomodoroLongBreakEvery.data,
  });

  const rpcStartMs = Date.now();
  console.log("[settings] rpc start", {
    reqId,
    tsMs: rpcStartMs,
    p_timezone: parsedTimezone.data,
    p_default_task_id: parsedDefaultTaskId.data ?? null,
    p_pomodoro_work_minutes: parsedPomodoroWorkMinutes.data,
    p_pomodoro_short_break_minutes: parsedPomodoroShortBreakMinutes.data,
    p_pomodoro_long_break_minutes: parsedPomodoroLongBreakMinutes.data,
    p_pomodoro_long_break_every: parsedPomodoroLongBreakEvery.data,
  });

  try {
    await rpcUpsertWithRetry(supabase, {
      p_timezone: parsedTimezone.data,
      p_default_task_id: parsedDefaultTaskId.data ?? null,
      p_pomodoro_work_minutes: parsedPomodoroWorkMinutes.data,
      p_pomodoro_short_break_minutes: parsedPomodoroShortBreakMinutes.data,
      p_pomodoro_long_break_minutes: parsedPomodoroLongBreakMinutes.data,
      p_pomodoro_long_break_every: parsedPomodoroLongBreakEvery.data,
    }, reqId);
    const rpcEndMs = Date.now();
    console.log("[settings] rpc end", {
      reqId,
      tsMs: rpcEndMs,
      durationMs: rpcEndMs - rpcStartMs,
    });
    console.log("[settings] rpc returned", { reqId, ok: true });
  } catch (err) {
    logServerError({
      scope: "actions.settings.upsertUserSettings",
      reqId,
      userId: userData.user.id,
      error: err,
      context: {
        rpc: "upsert_user_settings",
      },
    });
    throw err;
  } finally {
    const rpcFinallyMs = Date.now();
    console.log("[settings] rpc finally", {
      reqId,
      tsMs: rpcFinallyMs,
      durationMs: rpcFinallyMs - rpcStartMs,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/focus");
}

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
