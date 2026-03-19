import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import { sessionIdSchema } from "@/lib/validation/session.schema";
import {
  getActiveSessionForUser,
  type ServiceResult,
  type SessionRow,
} from "@/lib/services/sessions";

const ERROR_INVALID_ID = "Invalid identifier.";
const ERROR_NOT_FOUND = "Pomodoro session not found.";
const ERROR_UPDATE = "Unable to update pomodoro state.";

type PomodoroSessionUpdate = Partial<
  Pick<
    SessionRow,
    | "pomodoro_phase"
    | "pomodoro_phase_started_at"
    | "pomodoro_is_paused"
    | "pomodoro_paused_at"
    | "pomodoro_cycle_count"
  >
>;

async function getUserLongBreakEvery(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("pomodoro_long_break_every")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const value = data?.pomodoro_long_break_every;
  return typeof value === "number" && value > 0 ? value : 4;
}

async function updateActiveSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  update: PomodoroSessionUpdate,
): Promise<ServiceResult<SessionRow>> {
  const { data, error } = await supabase
    .from("sessions")
    .update(update)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { success: false, error: ERROR_NOT_FOUND };
  }

  const refreshed = await getActiveSessionForUser(supabase, userId);
  if (!refreshed.success) {
    return { success: false, error: ERROR_UPDATE };
  }

  if (!refreshed.data || refreshed.data.id !== sessionId) {
    return { success: false, error: ERROR_NOT_FOUND };
  }

  return { success: true, data: refreshed.data };
}

async function getOwnedActivePomodoroSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
) {
  const activeSession = await getActiveSessionForUser(supabase, userId);
  if (!activeSession.success) {
    return { ok: false as const, error: ERROR_UPDATE };
  }

  if (!activeSession.data || activeSession.data.id !== sessionId) {
    return { ok: false as const, error: ERROR_NOT_FOUND };
  }

  return { ok: true as const, session: activeSession.data };
}

export async function pomodoroInitForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    const active = await getOwnedActivePomodoroSession(supabase, userId, parsedId.data);
    if (!active.ok) {
      return { success: false, error: active.error };
    }

    return updateActiveSessionForUser(supabase, userId, parsedId.data, {
      pomodoro_phase: active.session.pomodoro_phase ?? "work",
      pomodoro_phase_started_at:
        active.session.pomodoro_phase_started_at ?? new Date().toISOString(),
      pomodoro_is_paused: false,
      pomodoro_paused_at: null,
    });
  } catch (error) {
    logServerError({
      scope: "services.pomodoro.pomodoroInitForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_UPDATE };
  }
}

export async function pomodoroPauseForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    const active = await getOwnedActivePomodoroSession(supabase, userId, parsedId.data);
    if (!active.ok) {
      return { success: false, error: active.error };
    }

    return updateActiveSessionForUser(supabase, userId, parsedId.data, {
      pomodoro_is_paused: true,
      pomodoro_paused_at: active.session.pomodoro_paused_at ?? new Date().toISOString(),
    });
  } catch (error) {
    logServerError({
      scope: "services.pomodoro.pomodoroPauseForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_UPDATE };
  }
}

export async function pomodoroResumeForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    const active = await getOwnedActivePomodoroSession(supabase, userId, parsedId.data);
    if (!active.ok) {
      return { success: false, error: active.error };
    }

    const now = Date.now();
    const phaseStartedAt = active.session.pomodoro_phase_started_at
      ? Date.parse(active.session.pomodoro_phase_started_at)
      : Number.NaN;
    const pausedAt = active.session.pomodoro_paused_at
      ? Date.parse(active.session.pomodoro_paused_at)
      : Number.NaN;

    let nextPhaseStartedAt = new Date().toISOString();
    if (!Number.isNaN(phaseStartedAt)) {
      nextPhaseStartedAt = Number.isNaN(pausedAt)
        ? new Date(phaseStartedAt).toISOString()
        : new Date(phaseStartedAt + Math.max(0, now - pausedAt)).toISOString();
    }

    return updateActiveSessionForUser(supabase, userId, parsedId.data, {
      pomodoro_is_paused: false,
      pomodoro_phase_started_at: nextPhaseStartedAt,
      pomodoro_paused_at: null,
    });
  } catch (error) {
    logServerError({
      scope: "services.pomodoro.pomodoroResumeForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_UPDATE };
  }
}

export async function pomodoroSkipPhaseForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    const active = await getOwnedActivePomodoroSession(supabase, userId, parsedId.data);
    if (!active.ok) {
      return { success: false, error: active.error };
    }

    const phase = active.session.pomodoro_phase;
    const cycleCount = active.session.pomodoro_cycle_count ?? 0;
    let nextPhase = "work";
    let nextCycleCount = cycleCount;

    if (phase === null) {
      nextPhase = "work";
    } else if (phase === "work") {
      nextCycleCount = cycleCount + 1;
      const longBreakEvery = await getUserLongBreakEvery(supabase, userId);
      nextPhase = nextCycleCount % longBreakEvery === 0 ? "long_break" : "short_break";
    }

    return updateActiveSessionForUser(supabase, userId, parsedId.data, {
      pomodoro_phase: nextPhase,
      pomodoro_cycle_count: nextCycleCount,
      pomodoro_phase_started_at: new Date().toISOString(),
      pomodoro_is_paused: false,
      pomodoro_paused_at: null,
    });
  } catch (error) {
    logServerError({
      scope: "services.pomodoro.pomodoroSkipPhaseForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_UPDATE };
  }
}

export async function pomodoroRestartPhaseForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    const active = await getOwnedActivePomodoroSession(supabase, userId, parsedId.data);
    if (!active.ok) {
      return { success: false, error: active.error };
    }

    return updateActiveSessionForUser(supabase, userId, parsedId.data, {
      pomodoro_phase_started_at: new Date().toISOString(),
      pomodoro_is_paused: false,
      pomodoro_paused_at: null,
    });
  } catch (error) {
    logServerError({
      scope: "services.pomodoro.pomodoroRestartPhaseForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_UPDATE };
  }
}
