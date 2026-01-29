"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessionIdSchema } from "@/lib/validation/session.schema";
import { logServerError } from "@/lib/logging/logServerError";
import type { SessionRow } from "@/app/actions/sessions";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const ERROR_INVALID_ID = "Invalid identifier.";
const ERROR_SIGN_IN = "You must be signed in.";
const ERROR_NOT_FOUND = "Pomodoro session not found.";
const ERROR_UPDATE = "Unable to update pomodoro state.";

function normalizeRpcRow<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  if (typeof data === "object") return data as T;
  return null;
}

async function callPomodoroRpc(
  rpc: string,
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);

  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: ERROR_SIGN_IN };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc(rpc, {
      p_session_id: parsedId.data,
    });

    if (error) {
      logServerError({
        scope: "actions.pomodoro.callPomodoroRpc",
        userId,
        error,
        context: { rpc },
      });
      return { success: false, error: ERROR_UPDATE };
    }

    const session = normalizeRpcRow<SessionRow>(data);

    if (!session) {
      return { success: false, error: ERROR_NOT_FOUND };
    }

    revalidatePath("/focus");

    return { success: true, data: session };
  } catch (error) {
    logServerError({
      scope: "actions.pomodoro.callPomodoroRpc",
      error,
      context: { rpc },
    });
    return { success: false, error: ERROR_UPDATE };
  }
}

export async function pomodoroInit(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return callPomodoroRpc("pomodoro_init", sessionId);
}

export async function pomodoroPause(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return callPomodoroRpc("pomodoro_pause", sessionId);
}

export async function pomodoroResume(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return callPomodoroRpc("pomodoro_resume", sessionId);
}

export async function pomodoroSkipPhase(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return callPomodoroRpc("pomodoro_skip_phase", sessionId);
}

export async function pomodoroRestartPhase(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return callPomodoroRpc("pomodoro_restart_phase", sessionId);
}
