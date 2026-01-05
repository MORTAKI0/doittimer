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
};

const timezoneSchema = z.string().min(1);
const defaultTaskSchema = taskIdSchema.nullable().optional();

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
  args: { p_timezone: string; p_default_task_id: string | null },
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
  const record = row as { timezone?: unknown; default_task_id?: unknown };
  const timezone = typeof record.timezone === "string" ? record.timezone : null;
  const defaultTaskId = typeof record.default_task_id === "string"
    ? record.default_task_id
    : null;

  if (!timezone) return null;

  return { timezone, default_task_id: defaultTaskId };
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
): Promise<void> {
  const reqId = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  const normalizedTimezone = (timezone ?? "").trim() || "Africa/Casablanca";
  const normalizedDefaultTaskId =
    defaultTaskId && defaultTaskId.trim() !== "" ? defaultTaskId : null;
  const parsedTimezone = timezoneSchema.safeParse(normalizedTimezone);
  const parsedDefaultTaskId = defaultTaskSchema.safeParse(normalizedDefaultTaskId);

  if (!parsedTimezone.success) {
    throw new Error("Invalid timezone.");
  }

  if (!parsedDefaultTaskId.success) {
    throw new Error("Invalid default task.");
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
  });

  const rpcStartMs = Date.now();
  console.log("[settings] rpc start", {
    reqId,
    tsMs: rpcStartMs,
    p_timezone: parsedTimezone.data,
    p_default_task_id: parsedDefaultTaskId.data ?? null,
  });

  try {
    await rpcUpsertWithRetry(supabase, {
      p_timezone: parsedTimezone.data,
      p_default_task_id: parsedDefaultTaskId.data ?? null,
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
