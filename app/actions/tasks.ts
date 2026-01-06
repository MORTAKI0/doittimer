"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseNullableInteger,
  taskIdSchema,
  taskPomodoroOverridesSchema,
  taskProjectIdSchema,
  taskTitleSchema,
} from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

const DUPLICATE_WINDOW_MS = 10_000;
const TASK_SELECT =
  "id, title, completed, created_at, project_id, pomodoro_work_minutes, pomodoro_short_break_minutes, pomodoro_long_break_minutes, pomodoro_long_break_every";

export type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  project_id: string | null;
  pomodoro_work_minutes?: number | null;
  pomodoro_short_break_minutes?: number | null;
  pomodoro_long_break_minutes?: number | null;
  pomodoro_long_break_every?: number | null;
};

export type TaskPomodoroOverrides = {
  workMinutes: number | null;
  shortBreakMinutes: number | null;
  longBreakMinutes: number | null;
  longBreakEvery: number | null;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function isRecentDuplicate(task: TaskRow | null) {
  if (!task?.created_at) return false;
  const createdAt = Date.parse(task.created_at);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < DUPLICATE_WINDOW_MS;
}

export async function createTask(
  title: string,
  projectId?: string | null,
): Promise<ActionResult<TaskRow>> {
  const parsed = taskTitleSchema.safeParse(title);
  const parsedProjectId = taskProjectIdSchema.safeParse(projectId ?? null);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Titre invalide.",
    };
  }

  if (!parsedProjectId.success) {
    return {
      success: false,
      error: parsedProjectId.error.issues[0]?.message ?? "Identifiant invalide.",
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

    const { data: existingTask } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userData.user.id)
      .eq("title", parsed.data)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTask && isRecentDuplicate(existingTask)) {
      return { success: true, data: existingTask };
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userData.user.id,
        title: parsed.data,
        project_id: parsedProjectId.data ?? null,
      })
      .select(TASK_SELECT)
      .single();

    if (error || !data) {
      logServerError({
        scope: "actions.tasks.createTask",
        userId,
        error: error ?? new Error("Task insert returned no data."),
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible de creer la tache. Reessaie.",
      };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.createTask",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTasks(): Promise<ActionResult<TaskRow[]>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "actions.tasks.getTasks",
        userId,
        error,
        context: { action: "select" },
      });
      return {
        success: false,
        error: "Impossible de charger les taches.",
      };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.getTasks",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function toggleTaskCompletion(
  taskId: string,
  completed: boolean,
): Promise<ActionResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

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

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Task not found" };
      }
      logServerError({
        scope: "actions.tasks.toggleTaskCompletion",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.toggleTaskCompletion",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskTitle(
  taskId: string,
  title: string,
): Promise<ActionResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);
  const parsedTitle = taskTitleSchema.safeParse(title);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (!parsedTitle.success) {
    return {
      success: false,
      error: parsedTitle.error.issues[0]?.message ?? "Titre invalide.",
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

    const { data, error } = await supabase
      .from("tasks")
      .update({ title: parsedTitle.data })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Task not found" };
      }
      logServerError({
        scope: "actions.tasks.updateTaskTitle",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.updateTaskTitle",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult<{ id: string }>> {
  const parsedId = taskIdSchema.safeParse(taskId);

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

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.tasks.deleteTask",
        userId,
        error,
        context: { action: "delete" },
      });
      return {
        success: false,
        error: "Impossible de supprimer la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.deleteTask",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskProject(
  taskId: string,
  projectId?: string | null,
): Promise<ActionResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);
  const parsedProjectId = taskProjectIdSchema.safeParse(projectId ?? null);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (!parsedProjectId.success) {
    return {
      success: false,
      error: parsedProjectId.error.issues[0]?.message ?? "Identifiant invalide.",
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

    const { data, error } = await supabase
      .from("tasks")
      .update({ project_id: parsedProjectId.data ?? null })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Task not found" };
      }
      logServerError({
        scope: "actions.tasks.updateTaskProject",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.updateTaskProject",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskPomodoroOverrides(
  taskId: string,
  overrides: TaskPomodoroOverrides | null,
): Promise<ActionResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  const normalizedOverrides = overrides
    ? {
      workMinutes: parseNullableInteger(overrides.workMinutes),
      shortBreakMinutes: parseNullableInteger(overrides.shortBreakMinutes),
      longBreakMinutes: parseNullableInteger(overrides.longBreakMinutes),
      longBreakEvery: parseNullableInteger(overrides.longBreakEvery),
    }
    : null;

  if (normalizedOverrides) {
    const allValid =
      normalizedOverrides.workMinutes.valid
      && normalizedOverrides.shortBreakMinutes.valid
      && normalizedOverrides.longBreakMinutes.valid
      && normalizedOverrides.longBreakEvery.valid;

    if (!allValid) {
      return { success: false, error: "Parametres pomodoro invalides." };
    }

    const parsedOverrides = taskPomodoroOverridesSchema.safeParse({
      workMinutes: normalizedOverrides.workMinutes.value,
      shortBreakMinutes: normalizedOverrides.shortBreakMinutes.value,
      longBreakMinutes: normalizedOverrides.longBreakMinutes.value,
      longBreakEvery: normalizedOverrides.longBreakEvery.value,
    });

    if (!parsedOverrides.success) {
      return { success: false, error: "Parametres pomodoro invalides." };
    }
  }

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const payload = normalizedOverrides
      ? {
        pomodoro_work_minutes: normalizedOverrides.workMinutes.value,
        pomodoro_short_break_minutes: normalizedOverrides.shortBreakMinutes.value,
        pomodoro_long_break_minutes: normalizedOverrides.longBreakMinutes.value,
        pomodoro_long_break_every: normalizedOverrides.longBreakEvery.value,
      }
      : {
        pomodoro_work_minutes: null,
        pomodoro_short_break_minutes: null,
        pomodoro_long_break_minutes: null,
        pomodoro_long_break_every: null,
      };

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Task not found" };
      }
      logServerError({
        scope: "actions.tasks.updateTaskPomodoroOverrides",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.updateTaskPomodoroOverrides",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
