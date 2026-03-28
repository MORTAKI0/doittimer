import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import type { TaskPriority } from "@/lib/tasks/types";
import {
  taskDescriptionSchema,
  taskEditableFieldsSchema,
  parseNullableInteger,
  taskIdSchema,
  taskPomodoroOverridesSchema,
  taskProjectIdSchema,
  taskPrioritySchema,
  taskScheduledForSchema,
  taskTitleSchema,
} from "@/lib/validation/task.schema";

const DUPLICATE_WINDOW_MS = 10_000;
export const TASK_SELECT =
  "id, title, description, priority, completed, completed_at, scheduled_for, created_at, updated_at, project_id, archived_at, source, read_only, pomodoro_work_minutes, pomodoro_short_break_minutes, pomodoro_long_break_minutes, pomodoro_long_break_every";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  section_name?: string | null;
  completed: boolean;
  completed_at?: string | null;
  scheduled_for?: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  archived_at: string | null;
  source: string;
  read_only: boolean;
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

export type TaskFilters = {
  includeArchived?: boolean;
  page?: number;
  limit?: number;
  projectId?: string | null;
  status?: "active" | "completed" | "archived" | "all";
  scheduledRange?: "all" | "day" | "week";
  scheduledDate?: string | null;
  includeUnscheduled?: boolean;
  scheduledOnly?: "all" | "scheduled" | "unscheduled";
  query?: string;
  completedFrom?: string | null;
  completedTo?: string | null;
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

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

export type TaskEditableFields = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  scheduledFor?: string | null;
  projectId?: string | null;
};

const ERROR_READ_ONLY_TASK = "This task is managed in Notion. Edit it in Notion and sync again.";

type TaskDbRow = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority | null;
  section_name: string | null;
  completed: boolean;
  completed_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  archived_at: string | null;
  source: string;
  read_only: boolean;
  pomodoro_work_minutes: number | null;
  pomodoro_short_break_minutes: number | null;
  pomodoro_long_break_minutes: number | null;
  pomodoro_long_break_every: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullablePriority(value: unknown): TaskPriority | null {
  if (value == null) return null;
  const parsed = taskPrioritySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function readTaskSelectRow(value: unknown): TaskDbRow | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const title = readString(value.title);
  const createdAt = readString(value.created_at);
  const updatedAt = readString(value.updated_at);
  const source = readString(value.source);

  if (!id || !title || !createdAt || !updatedAt || !source) {
    return null;
  }

  return {
    id,
    title,
    description: readNullableString(value.description),
    priority: readNullablePriority(value.priority),
    section_name: readNullableString(value.section_name),
    completed: readBoolean(value.completed),
    completed_at: readNullableString(value.completed_at),
    scheduled_for: readNullableString(value.scheduled_for),
    created_at: createdAt,
    updated_at: updatedAt,
    project_id: readNullableString(value.project_id),
    archived_at: readNullableString(value.archived_at),
    source,
    read_only: readBoolean(value.read_only),
    pomodoro_work_minutes: readNullableNumber(value.pomodoro_work_minutes),
    pomodoro_short_break_minutes: readNullableNumber(value.pomodoro_short_break_minutes),
    pomodoro_long_break_minutes: readNullableNumber(value.pomodoro_long_break_minutes),
    pomodoro_long_break_every: readNullableNumber(value.pomodoro_long_break_every),
  };
}

async function assertTaskWritable(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, read_only, source")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false as const, error: "Task not found" };
  }

  if (data.read_only || data.source === "notion") {
    return { ok: false as const, error: ERROR_READ_ONLY_TASK };
  }

  return { ok: true as const };
}

function isRecentDuplicate(task: TaskRow | null) {
  if (!task?.created_at) return false;
  const createdAt = Date.parse(task.created_at);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < DUPLICATE_WINDOW_MS;
}

function normalizeTaskPriority(value: unknown): TaskPriority {
  const parsed = taskPrioritySchema.safeParse(value);
  return parsed.success ? parsed.data : 4;
}

function normalizeTaskDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = taskDescriptionSchema.safeParse(value);
  if (!parsed.success) return value.trim() || null;
  return parsed.data.length > 0 ? parsed.data : null;
}

export function mapTaskRowFromDb(row: unknown): TaskRow {
  const parsedRow = readTaskSelectRow(row);

  if (!parsedRow) {
    return {
      id: "",
      title: "",
      description: null,
      priority: 4,
      section_name: null,
      completed: false,
      completed_at: null,
      scheduled_for: null,
      created_at: "",
      updated_at: "",
      project_id: null,
      archived_at: null,
      source: "",
      read_only: false,
      pomodoro_work_minutes: null,
      pomodoro_short_break_minutes: null,
      pomodoro_long_break_minutes: null,
      pomodoro_long_break_every: null,
    };
  }

  return {
    ...parsedRow,
    description: normalizeTaskDescription(parsedRow.description),
    priority: normalizeTaskPriority(parsedRow.priority),
  };
}

export function mapTaskRowsFromDb(rows: unknown): TaskRow[] {
  return Array.isArray(rows) ? rows.map(mapTaskRowFromDb) : [];
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function removeTaskFromQueueByOwner(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { error } = await supabase
    .from("task_queue_items")
    .delete()
    .eq("user_id", userId)
    .eq("task_id", taskId);

  return error;
}

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
  lt: (column: string, value: string) => T;
  ilike: (column: string, pattern: string) => T;
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
    scheduledOnly: "all" | "scheduled" | "unscheduled";
    query: string;
    completedFrom: string | null;
    completedTo: string | null;
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

  if (options.scheduledOnly === "unscheduled") {
    return next.is("scheduled_for", null);
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

  if (options.scheduledOnly === "scheduled" && options.scheduledRange === "all") {
    next = next.not("scheduled_for", "is", null);
  }

  if (options.query.length > 0) {
    const escaped = options.query.replaceAll("%", "\\%").replaceAll("_", "\\_");
    next = next.ilike("title", `%${escaped}%`);
  }

  if (options.completedFrom) {
    next = next.gte("completed_at", `${options.completedFrom}T00:00:00.000Z`);
  }

  if (options.completedTo) {
    next = next.lt("completed_at", `${options.completedTo}T00:00:00.000Z`);
  }

  return next;
}

export async function createTaskForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string;
    projectId?: string | null;
    scheduledFor?: string | null;
  },
): Promise<ServiceResult<TaskRow>> {
  const parsed = taskTitleSchema.safeParse(input.title);
  const parsedProjectId = taskProjectIdSchema.safeParse(input.projectId ?? null);
  const parsedScheduledFor =
    input.scheduledFor == null
      ? { success: true as const, data: null as string | null }
      : taskScheduledForSchema.safeParse(input.scheduledFor);

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

  if (!parsedScheduledFor.success) {
    return {
      success: false,
      error:
        parsedScheduledFor.error.issues[0]?.message
        ?? "Date invalide. Format attendu: YYYY-MM-DD.",
    };
  }

  try {
    const { data: existingTask } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("title", parsed.data)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTask && isRecentDuplicate(existingTask)) {
      return { success: true, data: mapTaskRowFromDb(existingTask) };
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: parsed.data,
        project_id: parsedProjectId.data ?? null,
        scheduled_for: parsedScheduledFor.data,
      })
      .select(TASK_SELECT)
      .single();

    if (error || !data) {
      logServerError({
        scope: "services.tasks.createTaskForUser",
        userId,
        error: error ?? new Error("Task insert returned no data."),
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible de creer la tache. Reessaie.",
      };
    }

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.createTaskForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTasksForUser(
  supabase: SupabaseClient,
  userId: string,
  filters: TaskFilters = {},
): Promise<ServiceResult<PaginatedTasks>> {
  try {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
    const includeArchived = Boolean(filters.includeArchived);
    const projectId = filters.projectId ?? null;
    const status = filters.status ?? "all";
    const scheduledRange = filters.scheduledRange ?? "all";
    const scheduledOnly = filters.scheduledOnly ?? "all";
    const includeUnscheduled =
      scheduledOnly === "all" ? (filters.includeUnscheduled ?? true) : false;
    const today = formatDateUTC(new Date());
    const scheduledDate = filters.scheduledDate ? toDateOnly(filters.scheduledDate) : null;
    const effectiveDate = scheduledDate ?? today;
    const query = typeof filters.query === "string" ? filters.query.trim() : "";
    const completedFrom = filters.completedFrom ? toDateOnly(filters.completedFrom) : null;
    const completedTo = filters.completedTo ? toDateOnly(filters.completedTo) : null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let countQuery = supabase
      .from("tasks")
      .select("id", { count: "exact", head: true });
    countQuery = applyTaskFilters(countQuery, {
      userId,
      includeArchived,
      projectId,
      status,
      scheduledRange,
      scheduledDate: effectiveDate,
      includeUnscheduled,
      scheduledOnly,
      query,
      completedFrom,
      completedTo,
    });

    const { error: countError, count } = await countQuery;
    if (countError) {
      logServerError({
        scope: "services.tasks.getTasksForUser",
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
      userId,
      includeArchived,
      projectId,
      status,
      scheduledRange,
      scheduledDate: effectiveDate,
      includeUnscheduled,
      scheduledOnly,
      query,
      completedFrom,
      completedTo,
    });

    const { data, error } = await dataQuery;

    if (error) {
      logServerError({
        scope: "services.tasks.getTasksForUser",
        userId,
        error,
        context: { action: "select" },
      });
      return {
        success: false,
        error: "Impossible de charger les taches.",
      };
    }

    const tasks = mapTaskRowsFromDb(data ?? []);
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
      scope: "services.tasks.getTasksForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTaskByIdForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<ServiceResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.tasks.getTaskByIdForUser",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger la tache." };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.getTaskByIdForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  fields: TaskEditableFields,
): Promise<ServiceResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  const parsedFields = taskEditableFieldsSchema.safeParse(fields);
  if (!parsedFields.success) {
    return {
      success: false,
      error: parsedFields.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  const payload: Record<string, string | number | null> = {};

  if (parsedFields.data.title !== undefined) {
    payload.title = parsedFields.data.title;
  }

  if (parsedFields.data.description !== undefined) {
    payload.description =
      parsedFields.data.description == null || parsedFields.data.description.length === 0
        ? null
        : parsedFields.data.description;
  }

  if (parsedFields.data.priority !== undefined) {
    payload.priority = parsedFields.data.priority;
  }

  if (parsedFields.data.scheduledFor !== undefined) {
    payload.scheduled_for = parsedFields.data.scheduledFor;
  }

  if (parsedFields.data.projectId !== undefined) {
    payload.project_id = parsedFields.data.projectId ?? null;
  }

  try {
    const writableTask = await assertTaskWritable(supabase, userId, parsedId.data);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.tasks.updateTaskForUser",
        userId,
        error,
        context: { action: "update", fields: Object.keys(payload) },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour la tache.",
      };
    }

    if (!data) {
      return { success: false, error: "Task not found" };
    }

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.updateTaskForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function setTaskCompletedForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  completed: boolean,
): Promise<ServiceResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const writableTask = await assertTaskWritable(supabase, userId, parsedId.data);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

    let autoArchiveCompleted = false;
    if (completed) {
      const { data: settingsRow, error: settingsError } = await supabase
        .from("user_settings")
        .select("auto_archive_completed")
        .eq("user_id", userId)
        .maybeSingle();

      if (settingsError) {
        logServerError({
          scope: "services.tasks.setTaskCompletedForUser",
          userId,
          error: settingsError,
          context: { action: "load-auto-archive-setting" },
        });
        return {
          success: false,
          error: "Impossible de mettre a jour la tache.",
        };
      }

      autoArchiveCompleted = settingsRow?.auto_archive_completed === true;
    }

    const now = completed ? new Date().toISOString() : null;
    const payload: {
      completed: boolean;
      completed_at: string | null;
      archived_at?: string;
    } = {
      completed,
      completed_at: now,
    };

    if (completed && autoArchiveCompleted && now) {
      payload.archived_at = now;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.tasks.setTaskCompletedForUser",
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

    if (completed && autoArchiveCompleted) {
      const queueError = await removeTaskFromQueueByOwner(supabase, userId, parsedId.data);
      if (queueError) {
        logServerError({
          scope: "services.tasks.setTaskCompletedForUser",
          userId,
          error: queueError,
          context: { action: "queue-cleanup-after-auto-archive" },
        });
        return {
          success: false,
          error: "Impossible de mettre a jour la tache.",
        };
      }
    }

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.setTaskCompletedForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskTitleForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  title: string,
): Promise<ServiceResult<TaskRow>> {
  return updateTaskForUser(supabase, userId, taskId, { title });
}

export async function setTaskScheduledForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  scheduledFor: string | null,
): Promise<ServiceResult<TaskRow>> {
  return updateTaskForUser(supabase, userId, taskId, { scheduledFor });
}

export async function updateTaskProjectForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  projectId?: string | null,
): Promise<ServiceResult<TaskRow>> {
  return updateTaskForUser(supabase, userId, taskId, { projectId });
}

export async function restoreTaskForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<ServiceResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const writableTask = await assertTaskWritable(supabase, userId, parsedId.data);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ archived_at: null })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.tasks.restoreTaskForUser",
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

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.restoreTaskForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function deleteTaskForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<ServiceResult<TaskRow>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const writableTask = await assertTaskWritable(supabase, userId, parsedId.data);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

    const archivedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .update({ archived_at: archivedAt })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(TASK_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.tasks.deleteTaskForUser",
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

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.deleteTaskForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTaskPomodoroStatsForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<ServiceResult<TaskPomodoroStats>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .maybeSingle();

    if (taskError) {
      logServerError({
        scope: "services.tasks.getTaskPomodoroStatsForUser",
        userId,
        error: taskError,
        context: { action: "select-task" },
      });
      return { success: false, error: "Impossible de charger les stats pomodoro." };
    }

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      logServerError({
        scope: "services.tasks.getTaskPomodoroStatsForUser",
        userId,
        error: settingsError,
        context: { action: "select-settings" },
      });
      return { success: false, error: "Impossible de charger les stats pomodoro." };
    }

    const timeZone = settings?.timezone ?? "Africa/Casablanca";
    const now = new Date();
    const nowInTimeZone = new Date(now.toLocaleString("en-US", { timeZone }));
    const startOfDayInTimeZone = new Date(nowInTimeZone);
    startOfDayInTimeZone.setHours(0, 0, 0, 0);
    const endOfDayInTimeZone = new Date(startOfDayInTimeZone);
    endOfDayInTimeZone.setDate(endOfDayInTimeZone.getDate() + 1);
    const startAt = new Date(
      startOfDayInTimeZone.getTime() - nowInTimeZone.getTimezoneOffset() * 60_000,
    ).toISOString();
    const endAt = new Date(
      endOfDayInTimeZone.getTime() - nowInTimeZone.getTimezoneOffset() * 60_000,
    ).toISOString();

    const { count: totalCount, error: totalError } = await supabase
      .from("session_pomodoro_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("task_id", parsedId.data)
      .eq("event_type", "work_completed");

    if (totalError) {
      logServerError({
        scope: "services.tasks.getTaskPomodoroStatsForUser",
        userId,
        error: totalError,
        context: { action: "count-total" },
      });
      return { success: false, error: "Impossible de charger les stats pomodoro." };
    }

    const { count: todayCount, error: todayError } = await supabase
      .from("session_pomodoro_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("task_id", parsedId.data)
      .eq("event_type", "work_completed")
      .gte("occurred_at", startAt)
      .lt("occurred_at", endAt);

    if (todayError) {
      logServerError({
        scope: "services.tasks.getTaskPomodoroStatsForUser",
        userId,
        error: todayError,
        context: { action: "count-today" },
      });
      return { success: false, error: "Impossible de charger les stats pomodoro." };
    }

    return {
      success: true,
      data: {
        pomodoros_today: toNumber(todayCount),
        pomodoros_total: toNumber(totalCount),
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.tasks.getTaskPomodoroStatsForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function updateTaskPomodoroOverridesForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  overrides: TaskPomodoroOverrides | null,
): Promise<ServiceResult<TaskRow>> {
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
      normalizedOverrides.workMinutes.valid &&
      normalizedOverrides.shortBreakMinutes.valid &&
      normalizedOverrides.longBreakMinutes.valid &&
      normalizedOverrides.longBreakEvery.valid;

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
    const writableTask = await assertTaskWritable(supabase, userId, parsedId.data);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

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
      .eq("user_id", userId)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Task not found" };
      }
      logServerError({
        scope: "services.tasks.updateTaskPomodoroOverridesForUser",
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

    return { success: true, data: mapTaskRowFromDb(data) };
  } catch (error) {
    logServerError({
      scope: "services.tasks.updateTaskPomodoroOverridesForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
