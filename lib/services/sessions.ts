import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { logServerError } from "@/lib/logging/logServerError";
import {
  normalizeMusicUrl,
  sessionIdSchema,
} from "@/lib/validation/session.schema";
import { taskIdSchema } from "@/lib/validation/task.schema";

export type SessionRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title?: string | null;
  music_url?: string | null;
  edited_at?: string | null;
  edit_reason?: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  pomodoro_phase?: string | null;
  pomodoro_phase_started_at?: string | null;
  pomodoro_is_paused?: boolean | null;
  pomodoro_paused_at?: string | null;
  pomodoro_cycle_count?: number | null;
};

export type ActiveSessionSnapshot = {
  id: string;
  started_at: string;
  ended_at: null;
};

export type DaySessionsTotal = {
  total_seconds: number;
};

export type SessionFilters = {
  day?: string | null;
  timeZone?: string | null;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

type SessionTableRow = Omit<SessionRow, "task_title">;

const SESSION_SELECT =
  "id, user_id, task_id, music_url, edited_at, edit_reason, started_at, ended_at, duration_seconds, pomodoro_phase, pomodoro_phase_started_at, pomodoro_is_paused, pomodoro_paused_at, pomodoro_cycle_count";

export const ACTIVE_SESSION_ERROR =
  "Une session est deja active. Arrete-la avant d'en demarrer une autre.";

const sessionTaskIdSchema = taskIdSchema.nullable().optional();
const sessionEditServiceInputSchema = z.object({
  startedAt: z.string().trim().datetime({ offset: true }).optional(),
  endedAt: z.string().trim().datetime({ offset: true }).optional(),
  taskId: taskIdSchema.nullable().optional(),
  editReason: z
    .string()
    .trim()
    .max(500, "Raison d'edition trop longue.")
    .optional(),
});
const sessionManualAddInputSchema = z.object({
  startedAt: z.string().trim().datetime({ offset: true }),
  endedAt: z.string().trim().datetime({ offset: true }),
  taskId: taskIdSchema.nullable().optional(),
});

function isValidDateOnly(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime());
}

function toInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getNowIso() {
  return new Date().toISOString();
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve date parts for time zone ${timeZone}.`);
  }

  return { year, month, day };
}

function parseTimeZoneOffsetMinutes(value: string) {
  if (value === "GMT" || value === "UTC") return 0;

  const match = value.match(/^GMT(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)$/);
  if (!match) {
    throw new Error(`Unsupported time zone offset format: ${value}`);
  }

  const [, sign, hoursText, minutesText] = match;
  const hours = Number(hoursText ?? "0");
  const minutes = Number(minutesText ?? "0");
  const direction = sign === "-" ? -1 : 1;
  return direction * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(timeZone: string, instant: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const zonePart = formatter
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!zonePart) {
    throw new Error(`Unable to resolve time zone offset for ${timeZone}.`);
  }

  return parseTimeZoneOffsetMinutes(zonePart);
}

function buildUtcRangeForLocalDay(day: string, timeZone: string) {
  const [yearText, monthText, dayText] = day.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const dayOfMonth = Number(dayText);
  const startCandidate = new Date(Date.UTC(year, month - 1, dayOfMonth, 0, 0, 0, 0));
  const endCandidate = new Date(Date.UTC(year, month - 1, dayOfMonth + 1, 0, 0, 0, 0));
  const startOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, startCandidate);
  const endOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, endCandidate);

  return {
    startAt: new Date(startCandidate.getTime() - startOffsetMinutes * 60_000).toISOString(),
    endAt: new Date(endCandidate.getTime() - endOffsetMinutes * 60_000).toISOString(),
  };
}

function getTodayDateOnlyForTimeZone(timeZone: string) {
  const parts = getDatePartsInTimeZone(new Date(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function getUserTimeZone(supabase: SupabaseClient, userId: string, fallback?: string | null) {
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.timezone?.trim() || "Africa/Casablanca";
}

async function resolveOwnedTaskId(
  supabase: SupabaseClient,
  userId: string,
  taskId: string | null | undefined,
) {
  if (!taskId) {
    return { taskId: null, taskTitle: null as string | null };
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    taskId: data?.id ?? null,
    taskTitle: data?.title ?? null,
  };
}

async function getTaskTitlesById(
  supabase: SupabaseClient,
  userId: string,
  taskIds: string[],
) {
  if (taskIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", taskIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id as string, row.title as string]));
}

async function hydrateSessionRows(
  supabase: SupabaseClient,
  userId: string,
  rows: SessionTableRow[],
): Promise<SessionRow[]> {
  const taskIds = Array.from(
    new Set(
      rows
        .map((row) => row.task_id)
        .filter((taskId): taskId is string => typeof taskId === "string"),
    ),
  );
  const taskTitles = await getTaskTitlesById(supabase, userId, taskIds);

  return rows.map((row) => ({
    ...row,
    task_title: row.task_id ? taskTitles.get(row.task_id) ?? null : null,
  }));
}

async function hydrateSessionRow(
  supabase: SupabaseClient,
  userId: string,
  row: SessionTableRow,
): Promise<SessionRow> {
  const [session] = await hydrateSessionRows(supabase, userId, [row]);
  return session;
}

async function getSessionTableRowForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  options?: { activeOnly?: boolean },
) {
  let query = supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (options?.activeOnly) {
    query = query.is("ended_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SessionTableRow | null) ?? null;
}

function getDurationSeconds(startedAtIso: string, endedAtIso: string) {
  const startedAt = Date.parse(startedAtIso);
  const endedAt = Date.parse(endedAtIso);

  if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

export async function startSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  input: { taskId?: string | null; musicUrl?: string | null },
): Promise<ServiceResult<SessionRow>> {
  const parsedTaskId = sessionTaskIdSchema.safeParse(input.taskId ?? null);
  const normalizedMusicUrl = normalizeMusicUrl(input.musicUrl);

  if (!parsedTaskId.success) {
    return {
      success: false,
      error: parsedTaskId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (normalizedMusicUrl.error) {
    return { success: false, error: normalizedMusicUrl.error };
  }

  try {
    const activeSession = await getActiveSessionForUser(supabase, userId);
    if (!activeSession.success) {
      return {
        success: false,
        error: "Impossible de verifier la session active.",
      };
    }

    if (activeSession.data) {
      return { success: false, error: ACTIVE_SESSION_ERROR };
    }

    const resolvedTask = await resolveOwnedTaskId(supabase, userId, parsedTaskId.data ?? null);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        task_id: resolvedTask.taskId,
        started_at: getNowIso(),
        music_url: normalizedMusicUrl.value,
      })
      .select(SESSION_SELECT)
      .single();

    if (error || !data) {
      if (
        error?.code === "23505" ||
        (typeof error?.message === "string" &&
          error.message.includes("sessions_one_active_per_user"))
      ) {
        return { success: false, error: ACTIVE_SESSION_ERROR };
      }

      logServerError({
        scope: "services.sessions.startSessionForUser",
        userId,
        error: error ?? new Error("Session insert returned no data."),
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible de demarrer la session.",
      };
    }

    return {
      success: true,
      data: {
        ...(data as SessionTableRow),
        task_title: resolvedTask.taskTitle,
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.startSessionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function stopSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const session = await getSessionTableRowForUser(supabase, userId, parsedId.data, {
      activeOnly: true,
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const endedAt = getNowIso();
    const durationSeconds = getDurationSeconds(session.started_at, endedAt);
    const { data, error } = await supabase
      .from("sessions")
      .update({
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .is("ended_at", null)
      .select(SESSION_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.sessions.stopSessionForUser",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible d'arreter la session.",
      };
    }

    if (!data) {
      return { success: false, error: "Session not found" };
    }

    return {
      success: true,
      data: await hydrateSessionRow(supabase, userId, data as SessionTableRow),
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.stopSessionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getActiveSessionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<SessionRow | null>> {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.sessions.getActiveSessionForUser",
        userId,
        error,
        context: { action: "select" },
      });
      return {
        success: false,
        error: "Impossible de charger la session active.",
      };
    }

    if (!data) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: await hydrateSessionRow(supabase, userId, data as SessionTableRow),
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.getActiveSessionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getSessionsForUser(
  supabase: SupabaseClient,
  userId: string,
  filters: SessionFilters = {},
): Promise<ServiceResult<SessionRow[]>> {
  if (filters.day != null && !isValidDateOnly(filters.day)) {
    return {
      success: false,
      error: "Date invalide. Format attendu: YYYY-MM-DD.",
    };
  }

  try {
    const timeZone = await getUserTimeZone(supabase, userId, filters.timeZone ?? null);
    const day = filters.day ?? getTodayDateOnlyForTimeZone(timeZone);
    const bounds = buildUtcRangeForLocalDay(day, timeZone);

    const { data, error } = await supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .gte("started_at", bounds.startAt)
      .lt("started_at", bounds.endAt)
      .order("started_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "services.sessions.getSessionsForUser",
        userId,
        error,
        context: { action: "select", day, timeZone },
      });
      return {
        success: false,
        error: "Impossible de charger les sessions.",
      };
    }

    return {
      success: true,
      data: await hydrateSessionRows(supabase, userId, (data ?? []) as SessionTableRow[]),
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.getSessionsForUser",
      userId,
      error,
      context: { day: filters.day ?? null, timeZone: filters.timeZone ?? null },
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getSessionTotalByDayForUser(
  supabase: SupabaseClient,
  userId: string,
  filters: SessionFilters = {},
): Promise<ServiceResult<DaySessionsTotal>> {
  if (filters.day != null && !isValidDateOnly(filters.day)) {
    return {
      success: false,
      error: "Date invalide. Format attendu: YYYY-MM-DD.",
    };
  }

  try {
    const timeZone = await getUserTimeZone(supabase, userId, filters.timeZone ?? null);
    const day = filters.day ?? getTodayDateOnlyForTimeZone(timeZone);
    const bounds = buildUtcRangeForLocalDay(day, timeZone);
    const nowIso = getNowIso();

    const { data, error } = await supabase
      .from("sessions")
      .select("started_at, ended_at, duration_seconds")
      .eq("user_id", userId)
      .gte("started_at", bounds.startAt)
      .lt("started_at", bounds.endAt);

    if (error) {
      logServerError({
        scope: "services.sessions.getSessionTotalByDayForUser",
        userId,
        error,
        context: { action: "select", day, timeZone },
      });
      return {
        success: false,
        error: "Impossible de charger le total des sessions.",
      };
    }

    const totalSeconds = (data ?? []).reduce((sum, row) => {
      if (row.ended_at) {
        return sum + toInteger(row.duration_seconds);
      }

      const runningEnd = nowIso < bounds.endAt ? nowIso : bounds.endAt;
      return sum + getDurationSeconds(row.started_at as string, runningEnd);
    }, 0);

    return {
      success: true,
      data: {
        total_seconds: totalSeconds,
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.getSessionTotalByDayForUser",
      userId,
      error,
      context: { day: filters.day ?? null, timeZone: filters.timeZone ?? null },
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function editSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  input: {
    startedAt?: string;
    endedAt?: string;
    taskId?: string | null;
    editReason?: string;
  },
): Promise<ServiceResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);
  const parsedInput = sessionEditServiceInputSchema.safeParse(input);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  try {
    const session = await getSessionTableRowForUser(supabase, userId, parsedId.data);

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.ended_at === null) {
      return {
        success: false,
        error: "Impossible de modifier une session active.",
      };
    }

    const nextStartedAt = parsedInput.data.startedAt ?? session.started_at;
    const nextEndedAt = parsedInput.data.endedAt ?? session.ended_at;

    if (Date.parse(nextEndedAt) < Date.parse(nextStartedAt)) {
      return {
        success: false,
        error: "L'heure de fin doit etre superieure ou egale a l'heure de debut.",
      };
    }

    const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);
    if (durationSeconds > 43_200) {
      return {
        success: false,
        error: "La duree maximale est de 12 heures.",
      };
    }

    let nextTaskId = session.task_id;
    if (parsedInput.data.taskId && parsedInput.data.taskId !== session.task_id) {
      const resolvedTask = await resolveOwnedTaskId(supabase, userId, parsedInput.data.taskId);
      if (!resolvedTask.taskId) {
        return {
          success: false,
          error: "Impossible de modifier la session.",
        };
      }
      nextTaskId = resolvedTask.taskId;
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({
        started_at: nextStartedAt,
        ended_at: nextEndedAt,
        task_id: nextTaskId,
        duration_seconds: durationSeconds,
        edited_at: getNowIso(),
        edit_reason:
          parsedInput.data.editReason === undefined
            ? session.edit_reason ?? null
            : parsedInput.data.editReason,
      })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(SESSION_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.sessions.editSessionForUser",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de modifier la session.",
      };
    }

    if (!data) {
      return { success: false, error: "Session not found" };
    }

    return {
      success: true,
      data: await hydrateSessionRow(supabase, userId, data as SessionTableRow),
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.editSessionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function addManualSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    startedAt: string;
    endedAt: string;
    taskId?: string | null;
  },
): Promise<ServiceResult<SessionRow>> {
  const parsedInput = sessionManualAddInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  try {
    if (Date.parse(parsedInput.data.endedAt) < Date.parse(parsedInput.data.startedAt)) {
      return {
        success: false,
        error: "L'heure de fin doit etre superieure ou egale a l'heure de debut.",
      };
    }

    const durationSeconds = getDurationSeconds(
      parsedInput.data.startedAt,
      parsedInput.data.endedAt,
    );
    if (durationSeconds > 43_200) {
      return {
        success: false,
        error: "La duree maximale est de 12 heures.",
      };
    }

    const resolvedTask = await resolveOwnedTaskId(
      supabase,
      userId,
      parsedInput.data.taskId ?? null,
    );

    if (parsedInput.data.taskId && !resolvedTask.taskId) {
      return {
        success: false,
        error: "Impossible d'ajouter la session.",
      };
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        task_id: resolvedTask.taskId,
        started_at: parsedInput.data.startedAt,
        ended_at: parsedInput.data.endedAt,
        duration_seconds: durationSeconds,
      })
      .select(SESSION_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.sessions.addManualSessionForUser",
        userId,
        error,
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible d'ajouter la session.",
      };
    }

    if (!data) {
      return { success: false, error: "Session introuvable." };
    }

    return {
      success: true,
      data: await hydrateSessionRow(supabase, userId, data as SessionTableRow),
    };
  } catch (error) {
    logServerError({
      scope: "services.sessions.addManualSessionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
