"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeMusicUrl,
  sessionIdSchema,
} from "@/lib/validation/session.schema";
import { taskIdSchema } from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

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
  created_at: string;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ACTIVE_SESSION_ERROR =
  "Une session est deja active. Arrete-la avant d'en demarrer une autre.";
const sessionTaskIdSchema = taskIdSchema.nullable().optional();
const sessionEditInputSchema = z.object({
  sessionId: sessionIdSchema,
  startedAt: z.string().trim().datetime({ offset: true }).optional(),
  endedAt: z.string().trim().datetime({ offset: true }).optional(),
  taskId: taskIdSchema.nullable().optional(),
  editReason: z
    .string()
    .trim()
    .max(500, "Raison d'edition trop longue.")
    .optional(),
});

function normalizeRpcRow<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  if (typeof data === "object") return data as T;
  return null;
}

function normalizeActiveSession(data: unknown): SessionRow | null {
  const candidate = normalizeRpcRow<SessionRow>(data);
  if (!candidate) return null;
  if (typeof candidate.id !== "string") return null;
  if (typeof candidate.started_at !== "string") return null;
  return candidate;
}

function normalizeRpcList<T>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") return [data as T];
  return [];
}

function logRpcDataShape(name: string, data: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.debug(`[rpc:${name}] data shape`, {
    type: typeof data,
    isArray: Array.isArray(data),
    data,
  });
}

export async function startSession(
  taskId?: string | null,
  musicUrl?: string | null,
): Promise<ActionResult<SessionRow>> {
  const parsedTaskId = sessionTaskIdSchema.safeParse(taskId ?? null);
  const normalizedMusicUrl = normalizeMusicUrl(musicUrl);

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
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data: activeData, error: activeError } = await supabase.rpc(
      "get_active_session_v2",
    );

    if (activeError) {
      logServerError({
        scope: "actions.sessions.startSession",
        userId,
        error: activeError,
        context: { rpc: "get_active_session_v2" },
      });
      return {
        success: false,
        error: "Impossible de verifier la session active.",
      };
    }

    const activeSession = normalizeActiveSession(activeData);

    if (activeSession) {
      return { success: false, error: ACTIVE_SESSION_ERROR };
    }

    const { data, error } = await supabase.rpc("start_session", {
      p_task_id: parsedTaskId.data ?? null,
    });

    if (error) {
      if (
        error.code === "23505" ||
        (typeof error.message === "string" &&
          error.message.includes("sessions_one_active_per_user"))
      ) {
        return { success: false, error: ACTIVE_SESSION_ERROR };
      }
      logServerError({
        scope: "actions.sessions.startSession",
        userId,
        error,
        context: { rpc: "start_session" },
      });
      return {
        success: false,
        error: "Impossible de demarrer la session.",
      };
    }

    let session = normalizeRpcRow<SessionRow>(data);

    if (!session) {
      return { success: false, error: "Impossible de demarrer la session." };
    }

    if (normalizedMusicUrl.value) {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ music_url: normalizedMusicUrl.value })
        .eq("id", session.id)
        .eq("user_id", userData.user.id)
        .select("music_url")
        .single();

      if (updateError) {
        logServerError({
          scope: "actions.sessions.startSession",
          userId,
          error: updateError,
          context: { action: "update_music_url" },
        });
      } else {
        session = { ...session, music_url: normalizedMusicUrl.value };
      }
    }

    revalidatePath("/focus");

    return { success: true, data: session };
  } catch (error) {
    logServerError({
      scope: "actions.sessions.startSession",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function stopSession(
  sessionId: string,
): Promise<ActionResult<SessionRow>> {
  const parsedId = sessionIdSchema.safeParse(sessionId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("stop_session", {
      p_session_id: parsedId.data,
    });

    if (error) {
      logServerError({
        scope: "actions.sessions.stopSession",
        userId,
        error,
        context: { rpc: "stop_session" },
      });
      return {
        success: false,
        error: "Impossible d'arreter la session.",
      };
    }

    const session = normalizeRpcRow<SessionRow>(data);

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    revalidatePath("/focus");

    return { success: true, data: session };
  } catch (error) {
    logServerError({
      scope: "actions.sessions.stopSession",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getActiveSession(): Promise<
  ActionResult<SessionRow | null>
> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("get_active_session_v2");

    if (error) {
      logServerError({
        scope: "actions.sessions.getActiveSession",
        userId,
        error,
        context: { rpc: "get_active_session_v2" },
      });
      return {
        success: false,
        error: "Impossible de charger la session active.",
      };
    }

    logRpcDataShape("get_active_session_v2", data);
    const session = normalizeActiveSession(data);

    return { success: true, data: session ?? null };
  } catch (error) {
    logServerError({
      scope: "actions.sessions.getActiveSession",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTodaySessions(): Promise<ActionResult<SessionRow[]>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("get_today_sessions");

    if (error) {
      logServerError({
        scope: "actions.sessions.getTodaySessions",
        userId,
        error,
        context: { rpc: "get_today_sessions" },
      });
      return {
        success: false,
        error: "Impossible de charger les sessions du jour.",
      };
    }

    const sessions = normalizeRpcList<SessionRow>(data);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions.getTodaySessions] first row", {
        count: sessions.length,
        first: sessions[0]
          ? {
              id: sessions[0].id,
              started_at: sessions[0].started_at,
              ended_at: sessions[0].ended_at,
              duration_seconds: sessions[0].duration_seconds,
              edited_at: sessions[0].edited_at,
              edit_reason: sessions[0].edit_reason,
            }
          : null,
      });
    }

    return { success: true, data: sessions };
  } catch (error) {
    logServerError({
      scope: "actions.sessions.getTodaySessions",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function editSession(input: {
  sessionId: string;
  startedAt?: string;
  endedAt?: string;
  taskId?: string | null;
  editReason?: string;
}): Promise<ActionResult<SessionRow>> {
  const parsed = sessionEditInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;
    const payload = parsed.data;
    const { data, error } = await supabase.rpc("session_edit", {
      p_session_id: payload.sessionId,
      p_started_at: payload.startedAt ?? null,
      p_ended_at: payload.endedAt ?? null,
      p_task_id: payload.taskId ?? null,
      p_edit_reason:
        payload.editReason == null
          ? null
          : payload.editReason.length > 0
            ? payload.editReason
            : "",
    });

    if (error) {
      if (typeof error.message === "string") {
        if (error.message.includes("cannot edit active session")) {
          return {
            success: false,
            error: "Impossible de modifier une session active.",
          };
        }
        if (
          error.message.includes(
            "ended_at must be greater than or equal to started_at",
          )
        ) {
          return {
            success: false,
            error:
              "L'heure de fin doit etre superieure ou egale a l'heure de debut.",
          };
        }
        if (error.message.includes("duration exceeds 12 hours")) {
          return {
            success: false,
            error: "La duree maximale est de 12 heures.",
          };
        }
        if (error.message.includes("unauthorized")) {
          return {
            success: false,
            error: "Tu ne peux modifier que tes sessions.",
          };
        }
      }

      logServerError({
        scope: "actions.sessions.editSession",
        userId,
        error,
        context: { rpc: "session_edit" },
      });
      return {
        success: false,
        error: "Impossible de modifier la session.",
      };
    }

    const session = normalizeRpcRow<SessionRow>(data);

    if (!session) {
      return { success: false, error: "Session introuvable." };
    }

    revalidatePath("/focus");

    return { success: true, data: session };
  } catch (error) {
    logServerError({
      scope: "actions.sessions.editSession",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
