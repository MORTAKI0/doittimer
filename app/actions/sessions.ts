"use server";

import { revalidatePath } from "next/cache";

import { requireSignedInUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/logging/logServerError";
import {
  addManualSessionForUser,
  editSessionForUser,
  getActiveSessionForUser,
  getSessionTotalByDayForUser,
  getSessionsForUser,
  startSessionForUser,
  stopSessionForUser,
  type ActiveSessionSnapshot,
  type DaySessionsTotal,
  type ServiceResult,
  type SessionRow,
} from "@/lib/services/sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { ActiveSessionSnapshot, DaySessionsTotal, SessionRow } from "@/lib/services/sessions";

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
      return { success: false, error: auth.error };
    }

    return handler(supabase, auth.user.id);
  } catch (error) {
    logServerError({ scope, error });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

function revalidateFocusAndDashboard() {
  revalidatePath("/home");
  revalidatePath("/focus");
  revalidatePath("/dashboard");
}

export async function startSession(
  taskId?: string | null,
  musicUrl?: string | null,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.sessions.startSession", async (supabase, userId) => {
    const result = await startSessionForUser(supabase, userId, { taskId, musicUrl });

    if (result.success) {
      revalidateFocusAndDashboard();
    }

    return result;
  });
}

export async function stopSession(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.sessions.stopSession", async (supabase, userId) => {
    const result = await stopSessionForUser(supabase, userId, sessionId);

    if (result.success) {
      revalidateFocusAndDashboard();
    }

    return result;
  });
}

export async function getActiveSession(): Promise<ActiveSessionSnapshot | null> {
  const result = await runWithSignedInUser(
    "actions.sessions.getActiveSession",
    (supabase, userId) => getActiveSessionForUser(supabase, userId),
  );

  if (!result.success || !result.data || result.data.ended_at !== null) {
    return null;
  }

  return {
    id: result.data.id,
    started_at: result.data.started_at,
    ended_at: null,
  };
}

export async function getActiveSessionDetails(): Promise<
  ActionResult<SessionRow | null>
> {
  return runWithSignedInUser(
    "actions.sessions.getActiveSessionDetails",
    (supabase, userId) => getActiveSessionForUser(supabase, userId),
  );
}

export async function getSessionsByDay(
  day?: string | null,
): Promise<ActionResult<SessionRow[]>> {
  return runWithSignedInUser("actions.sessions.getSessionsByDay", (supabase, userId) =>
    getSessionsForUser(supabase, userId, { day: day ?? null }),
  );
}

export async function getSessionTotalByDay(
  day?: string | null,
): Promise<ActionResult<DaySessionsTotal>> {
  return runWithSignedInUser(
    "actions.sessions.getSessionTotalByDay",
    (supabase, userId) => getSessionTotalByDayForUser(supabase, userId, { day: day ?? null }),
  );
}

export async function getTodaySessions(): Promise<ActionResult<SessionRow[]>> {
  return getSessionsByDay(null);
}

export async function editSession(input: {
  sessionId: string;
  startedAt?: string;
  endedAt?: string;
  taskId?: string | null;
  editReason?: string;
}): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser("actions.sessions.editSession", async (supabase, userId) => {
    const result = await editSessionForUser(supabase, userId, input.sessionId, {
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      taskId: input.taskId,
      editReason: input.editReason,
    });

    if (result.success) {
      revalidateFocusAndDashboard();
      return result;
    }

    if (result.error === "Session not found") {
      return {
        success: false,
        error: "Impossible de modifier la session.",
      };
    }

    return result;
  });
}

export async function addManualSession(input: {
  startedAt: string;
  endedAt: string;
  taskId?: string | null;
}): Promise<ActionResult<SessionRow>> {
  return runWithSignedInUser(
    "actions.sessions.addManualSession",
    async (supabase, userId) => {
      const result = await addManualSessionForUser(supabase, userId, input);

      if (result.success) {
        revalidateFocusAndDashboard();
      }

      return result;
    },
  );
}
