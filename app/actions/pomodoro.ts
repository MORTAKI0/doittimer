"use server";

import { revalidatePath } from "next/cache";

import { requireSignedInUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/logging/logServerError";
import {
  pomodoroInitForUser,
  pomodoroPauseForUser,
  pomodoroRestartPhaseForUser,
  pomodoroResumeForUser,
  pomodoroSkipPhaseForUser,
} from "@/lib/services/pomodoro";
import type { ServiceResult, SessionRow } from "@/lib/services/sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T> = ServiceResult<T>;

async function runWithSignedInUser<T>(
  scope: string,
  handler: (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    userId: string,
  ) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createSupabaseServerClient();
    const auth = await requireSignedInUser(supabase);

    if (auth.error || !auth.user) {
      return { success: false, error: "You must be signed in." };
    }

    return handler(supabase, auth.user.id);
  } catch (error) {
    logServerError({ scope, error });
    return {
      success: false,
      error: "Unable to update pomodoro state.",
    };
  }
}

function revalidateFocus() {
  revalidatePath("/focus");
}

export async function pomodoroInit(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.pomodoro.pomodoroInit", async (supabase, userId) => {
    const result = await pomodoroInitForUser(supabase, userId, sessionId);

    if (result.success) {
      revalidateFocus();
    }

    return result;
  });
}

export async function pomodoroPause(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.pomodoro.pomodoroPause", async (supabase, userId) => {
    const result = await pomodoroPauseForUser(supabase, userId, sessionId);

    if (result.success) {
      revalidateFocus();
    }

    return result;
  });
}

export async function pomodoroResume(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.pomodoro.pomodoroResume", async (supabase, userId) => {
    const result = await pomodoroResumeForUser(supabase, userId, sessionId);

    if (result.success) {
      revalidateFocus();
    }

    return result;
  });
}

export async function pomodoroSkipPhase(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser(
    "actions.pomodoro.pomodoroSkipPhase",
    async (supabase, userId) => {
      const result = await pomodoroSkipPhaseForUser(supabase, userId, sessionId);

      if (result.success) {
        revalidateFocus();
      }

      return result;
    },
  );
}

export async function pomodoroRestartPhase(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser(
    "actions.pomodoro.pomodoroRestartPhase",
    async (supabase, userId) => {
      const result = await pomodoroRestartPhaseForUser(supabase, userId, sessionId);

      if (result.success) {
        revalidateFocus();
      }

      return result;
    },
  );
}
