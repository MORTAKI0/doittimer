"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseNullableInteger,
  taskIdSchema,
  taskPomodoroOverridesSchema,
  taskProjectIdSchema,
  taskScheduledForSchema,
  taskTitleSchema,
} from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

const DUPLICATE_WINDOW_MS = 10_000;
const TASK_SELECT =
  "id, title, completed, completed_at, scheduled_for, created_at, updated_at, project_id, archived_at, pomodoro_work_minutes, pomodoro_short_break_minutes, pomodoro_long_break_minutes, pomodoro_long_break_every";

export type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  scheduled_for?: string | null;
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
  projectId?: string | null;
  status?: "active" | "completed" | "archived" | "all";
  scheduledRange?: "all" | "day" | "week";
  scheduledDate?: string | null;
  includeUnscheduled?: boolean;
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

function toDateOnly(value: string): string | null {
  const parsed = taskScheduledForSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(date, delta);
}

function formatDateUTC(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function applyTaskFilters<T extends {
  eq: (column: string, value: unknown) => T;
  is: (column: string, value: null) => T;
  not: (column: string, operator: string, value: unknown) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  or: (filters: string) => T;
}>(
  query: T,
  options: {
    userId: string;
    includeArchived: boolean;
    projectId: string | null;
    status: "active" | "completed" | "archived" | "all";
    scheduledRange: "all" | "day" | "week";
    scheduledDate: string;
    includeUnscheduled: boolean;
  },
) {
  let next = query.eq("user_id", options.userId);

  if (options.projectId) {
    next = next.eq("project_id", options.projectId);
  }

  if (options.status === "active") {
    next = next.eq("completed", false).is("archived_at", null);
  } else if (options.status === "completed") {
    next = next.eq("completed", true).is("archived_at", null);
  } else if (options.status === "archived") {
    next = next.not("archived_at", "is", null);
  } else if (!options.includeArchived) {
    next = next.is("archived_at", null);
  }

  if (options.scheduledRange === "day") {
    if (options.includeUnscheduled) {
      next = next.or(`scheduled_for.eq.${options.scheduledDate},scheduled_for.is.null`);
    } else {
      next = next.eq("scheduled_for", options.scheduledDate);
    }
  } else if (options.scheduledRange === "week") {
    const anchor = new Date(`${options.scheduledDate}T00:00:00.000Z`);
    const weekStart = formatDateUTC(startOfWeekMonday(anchor));
    const weekEnd = formatDateUTC(addDays(startOfWeekMonday(anchor), 6));

    if (options.includeUnscheduled) {
      next = next.or(
        `and(scheduled_for.gte.${weekStart},scheduled_for.lte.${weekEnd}),scheduled_for.is.null`,
      );
    } else {
      next = next.gte("scheduled_for", weekStart).lte("scheduled_for", weekEnd);
    }
  }

  return next;
}

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
    const projectId = options.projectId ?? null;
    const status = options.status ?? "all";
    const scheduledRange = options.scheduledRange ?? "all";
    const includeUnscheduled = options.includeUnscheduled ?? true;
    const today = formatDateUTC(new Date());
    const scheduledDate = options.scheduledDate ? toDateOnly(options.scheduledDate) : null;
    const effectiveDate = scheduledDate ?? today;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let countQuery = supabase
      .from("tasks")
      .select("id", { count: "exact", head: true });
    countQuery = applyTaskFilters(countQuery, {
      userId: userData.user.id,
      includeArchived,
      projectId,
      status,
      scheduledRange,
      scheduledDate: effectiveDate,
      includeUnscheduled,
    });

    const { error: countError, count } = await countQuery;
    if (countError) {
      logServerError({
        scope: "actions.tasks.getTasks",
        userId,
        error: countError,
        context: { action: "count-select" },
      });
      return {
        success: false,
        error: "Impossible de charger les taches.",
      };
    }

    let dataQuery = supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("updated_at", { ascending: false })
      .range(from, to);
    dataQuery = applyTaskFilters(dataQuery, {
      userId: userData.user.id,
      includeArchived,
      projectId,
      status,
      scheduledRange,
      scheduledDate: effectiveDate,
      includeUnscheduled,
    });

    const { data, error } = await dataQuery;

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

    const tasks: TaskRow[] = Array.isArray(data) ? data : [];
    const totalCount = count ?? 0;
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

export async function setTaskScheduledFor(
  taskId: string,
  scheduledFor: string | null,
): Promise<ActionResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (scheduledFor !== null) {
    const parsedScheduledFor = taskScheduledForSchema.safeParse(scheduledFor);
    if (!parsedScheduledFor.success) {
      return {
        success: false,
        error:
          parsedScheduledFor.error.issues[0]?.message
          ?? "Date invalide. Format attendu: YYYY-MM-DD.",
      };
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

    const { data, error } = await supabase
      .from("tasks")
      .update({ scheduled_for: scheduledFor })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.tasks.setTaskScheduledFor",
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
      scope: "actions.tasks.setTaskScheduledFor",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function setTaskCompleted(
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

    const completedAt = completed ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed, completed_at: completedAt })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.tasks.setTaskCompleted",
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
      scope: "actions.tasks.setTaskCompleted",
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
  return setTaskCompleted(taskId, completed);
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
