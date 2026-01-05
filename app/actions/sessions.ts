"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessionIdSchema } from "@/lib/validation/session.schema";
import { taskIdSchema } from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

export type SessionRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title?: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const ACTIVE_SESSION_ERROR = "Une session est deja active. Arrete-la avant d'en demarrer une autre.";
const sessionTaskIdSchema = taskIdSchema.nullable().optional();

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

export async function startSession(taskId?: string | null): Promise<ActionResult<SessionRow>> {
  const parsedTaskId = sessionTaskIdSchema.safeParse(taskId ?? null);

  if (!parsedTaskId.success) {
    return {
      success: false,
      error: parsedTaskId.error.issues[0]?.message ?? "Identifiant invalide.",
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

    const { data: activeData, error: activeError } = await supabase.rpc("get_active_session");

    if (activeError) {
      logServerError({
        scope: "actions.sessions.startSession",
        userId,
        error: activeError,
        context: { rpc: "get_active_session" },
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

    const session = normalizeRpcRow<SessionRow>(data);

    if (!session) {
      return { success: false, error: "Impossible de demarrer la session." };
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

export async function stopSession(sessionId: string): Promise<ActionResult<SessionRow>> {
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

export async function getActiveSession(): Promise<ActionResult<SessionRow | null>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("get_active_session");

    if (error) {
      logServerError({
        scope: "actions.sessions.getActiveSession",
        userId,
        error,
        context: { rpc: "get_active_session" },
      });
      return { success: false, error: "Impossible de charger la session active." };
    }

    logRpcDataShape("get_active_session", data);
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
      return { success: false, error: "Impossible de charger les sessions du jour." };
    }

    const sessions = normalizeRpcList<SessionRow>(data);

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
