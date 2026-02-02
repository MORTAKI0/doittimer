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
  "id, title, completed, created_at, updated_at, project_id, archived_at, pomodoro_work_minutes, pomodoro_short_break_minutes, pomodoro_long_break_minutes, pomodoro_long_break_every";

export type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  archived_at: string | null;
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

export type TaskPomodoroStats = {
  pomodoros_today: number;
  pomodoros_total: number;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function isRecentDuplicate(task: TaskRow | null) {
  if (!task?.created_at) return false;
  const createdAt = Date.parse(task.created_at);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < DUPLICATE_WINDOW_MS;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

type GetTasksOptions = {
  includeArchived?: boolean;
  page?: number;
  limit?: number;
};

export type PaginatedTasks = {
  tasks: TaskRow[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};

export async function getTasks(
  options: GetTasksOptions = {},
): Promise<ActionResult<PaginatedTasks>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, Math.min(100, options.limit ?? 20));
    const includeArchived = Boolean(options.includeArchived);

    const { data, error } = await supabase.rpc("get_tasks_page", {
      p_page: page,
      p_limit: limit,
      p_include_archived: includeArchived,
    });

    if (error) {
      logServerError({
        scope: "actions.tasks.getTasks",
        userId,
        error,
        context: { action: "rpc", rpc: "get_tasks_page" },
      });
      return {
        success: false,
        error: "Impossible de charger les taches.",
      };
    }

    const tasks: TaskRow[] = [];
    let totalCount = 0;

    if (data && Array.isArray(data) && data.length > 0) {
      // Extract total_count from the first row and map rows to TaskRow
      totalCount = Number(data[0].total_count) || 0;

      // Map RPC result to TaskRow type. RPC returns camel_case or snake_case depending on configuration,
      // but based on the definition "returns table (...)", it should match columns.
      // We explicitly map just to be safe and match TaskRow type.
      tasks.push(
        ...data.map((row: any) => ({
          id: row.id,
          title: row.title,
          completed: row.completed,
          created_at: row.created_at,
          updated_at: row.updated_at,
          project_id: row.project_id,
          archived_at: row.archived_at,
          // RPC might strictly return defined columns. If we need pomodoro fields,
          // we should have included them in RPC or we fetch them separately (inefficient) 
          // OR we accept they are missing in the list view (common pattern).
          // For now, let's assume they are undefined in the list view unless added to RPC.
        }))
      );
    } else if (data && !Array.isArray(data)) {
      // Handle single object return if edge case
      totalCount = 0;
    }


    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      },
    };
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

export async function getTaskPomodoroStats(
  taskId: string,
): Promise<ActionResult<TaskPomodoroStats>> {
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

    const { data, error } = await supabase.rpc("get_task_pomodoro_stats", {
      p_task_id: parsedId.data,
    });

    if (error) {
      logServerError({
        scope: "actions.tasks.getTaskPomodoroStats",
        userId,
        error,
        context: { rpc: "get_task_pomodoro_stats" },
      });
      return { success: false, error: "Impossible de charger les stats pomodoro." };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: {
        pomodoros_today: toNumber(row?.pomodoros_today),
        pomodoros_total: toNumber(row?.pomodoros_total),
      },
    };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.getTaskPomodoroStats",
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

export async function deleteTask(taskId: string): Promise<ActionResult<TaskRow>> {
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

    const archivedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .update({ archived_at: archivedAt })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.tasks.deleteTask",
        userId,
        error,
        context: { action: "archive" },
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
    revalidatePath("/focus");
    revalidatePath("/settings");

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

export async function restoreTask(taskId: string): Promise<ActionResult<TaskRow>> {
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
      .update({ archived_at: null })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.tasks.restoreTask",
        userId,
        error,
        context: { action: "restore" },
      });
      return {
        success: false,
        error: "Impossible de restaurer la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/tasks");
    revalidatePath("/focus");
    revalidatePath("/settings");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.tasks.restoreTask",
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
