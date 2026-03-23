import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import { taskIdSchema, taskScheduledForSchema } from "@/lib/validation/task.schema";

export type TaskQueueRow = {
  task_id: string;
  queue_date: string;
  sort_order: number;
  created_at: string;
  title: string;
  completed: boolean;
  project_id: string | null;
  archived_at: string | null;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

const DEFAULT_TIMEZONE = "Africa/Casablanca";
const MAX_QUEUE_ITEMS = 7;
const ERROR_QUEUE_FULL = "Limite de 7 elements atteinte.";
const ERROR_TASK_NOT_FOUND = "Tache introuvable.";
const ERROR_LIST = "Impossible de charger la file.";
const ERROR_MUTATE = "Impossible de mettre a jour la file.";

type QueueTableRow = {
  task_id: string;
  queue_date: string;
  sort_order: number;
  created_at: string;
};

type QueueTaskRow = {
  id: string;
  title: string;
  completed: boolean;
  project_id: string | null;
  archived_at: string | null;
};

function normalizeTaskIdInput(taskId: string) {
  const trimmed = taskId.trim();
  const withoutQuery = trimmed.split("?")[0] ?? trimmed;
  const lastSegment = withoutQuery.split("/").filter(Boolean).at(-1) ?? withoutQuery;

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
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

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value || value.trim().length === 0) return false;

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function getUserTimeZone(
  supabase: SupabaseClient,
  userId: string,
  fallback = DEFAULT_TIMEZONE,
) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return isValidTimezone(data?.timezone) ? data.timezone : fallback;
}

async function resolveQueueDateForUser(
  supabase: SupabaseClient,
  userId: string,
  queueDate?: string | null,
) {
  if (queueDate != null) {
    const parsedDate = taskScheduledForSchema.safeParse(queueDate);
    if (!parsedDate.success) {
      return {
        success: false as const,
        error: parsedDate.error.issues[0]?.message ?? "Date invalide. Format attendu: YYYY-MM-DD.",
      };
    }

    return { success: true as const, data: parsedDate.data };
  }

  const timeZone = await getUserTimeZone(supabase, userId);
  const parts = getDatePartsInTimeZone(new Date(), timeZone);
  return {
    success: true as const,
    data: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

async function getOwnedTaskForQueue(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, archived_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string; archived_at: string | null } | null;
}

async function getQueueTableRows(
  supabase: SupabaseClient,
  userId: string,
  queueDate: string,
) {
  const { data, error } = await supabase
    .from("task_queue_items")
    .select("task_id, queue_date, sort_order, created_at")
    .eq("user_id", userId)
    .eq("queue_date", queueDate)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as QueueTableRow[];
}

async function hydrateQueueRows(
  supabase: SupabaseClient,
  userId: string,
  rows: QueueTableRow[],
): Promise<TaskQueueRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const taskIds = rows.map((row) => row.task_id);
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, completed, project_id, archived_at")
    .eq("user_id", userId)
    .in("id", taskIds);

  if (error) {
    throw error;
  }

  const tasksById = new Map<string, QueueTaskRow>();
  for (const row of (data ?? []) as QueueTaskRow[]) {
    tasksById.set(row.id, row);
  }

  return rows.flatMap((row) => {
    const task = tasksById.get(row.task_id);
    if (!task) return [];

    return [
      {
        task_id: row.task_id,
        queue_date: row.queue_date,
        sort_order: row.sort_order,
        created_at: row.created_at,
        title: task.title,
        completed: task.completed,
        project_id: task.project_id,
        archived_at: task.archived_at,
      },
    ];
  });
}

async function listQueueForDate(
  supabase: SupabaseClient,
  userId: string,
  queueDate: string,
) {
  const rows = await getQueueTableRows(supabase, userId, queueDate);
  return hydrateQueueRows(supabase, userId, rows);
}

async function rewriteQueueOrder(
  supabase: SupabaseClient,
  userId: string,
  queueDate: string,
  orderedTaskIds: string[],
) {
  if (orderedTaskIds.length === 0) {
    return;
  }

  const tempStart = orderedTaskIds.length + 16;
  const tempRows = orderedTaskIds.map((taskId, index) => ({
    user_id: userId,
    queue_date: queueDate,
    task_id: taskId,
    sort_order: tempStart + index,
  }));
  const finalRows = orderedTaskIds.map((taskId, index) => ({
    user_id: userId,
    queue_date: queueDate,
    task_id: taskId,
    sort_order: index,
  }));

  const { error: tempError } = await supabase
    .from("task_queue_items")
    .upsert(tempRows, { onConflict: "user_id,queue_date,task_id" });

  if (tempError) {
    throw tempError;
  }

  const { error: finalError } = await supabase
    .from("task_queue_items")
    .upsert(finalRows, { onConflict: "user_id,queue_date,task_id" });

  if (finalError) {
    throw finalError;
  }
}

export async function getTaskQueueForUser(
  supabase: SupabaseClient,
  userId: string,
  queueDate?: string | null,
): Promise<ServiceResult<TaskQueueRow[]>> {
  try {
    const effectiveDate = await resolveQueueDateForUser(supabase, userId, queueDate);
    if (!effectiveDate.success) {
      return effectiveDate;
    }

    return {
      success: true,
      data: await listQueueForDate(supabase, userId, effectiveDate.data),
    };
  } catch (error) {
    logServerError({
      scope: "services.queue.getTaskQueueForUser",
      userId,
      error,
      context: { queueDate: queueDate ?? null },
    });
    return { success: false, error: ERROR_LIST };
  }
}

export async function addTaskToQueueForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  queueDate?: string | null,
): Promise<ServiceResult<TaskQueueRow[]>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  if (!parsedTaskId.success) {
    return {
      success: false,
      error: parsedTaskId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const effectiveDate = await resolveQueueDateForUser(supabase, userId, queueDate);
    if (!effectiveDate.success) {
      return effectiveDate;
    }

    const task = await getOwnedTaskForQueue(supabase, userId, parsedTaskId.data);
    if (!task || task.archived_at) {
      return { success: false, error: ERROR_TASK_NOT_FOUND };
    }

    const { count, error: countError } = await supabase
      .from("task_queue_items")
      .select("task_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("queue_date", effectiveDate.data);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) >= MAX_QUEUE_ITEMS) {
      return { success: false, error: ERROR_QUEUE_FULL };
    }

    const { data: lastRow, error: lastRowError } = await supabase
      .from("task_queue_items")
      .select("sort_order")
      .eq("user_id", userId)
      .eq("queue_date", effectiveDate.data)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRowError) {
      throw lastRowError;
    }

    const nextSortOrder = (lastRow?.sort_order ?? -1) + 1;
    const { error: insertError } = await supabase
      .from("task_queue_items")
      .upsert(
        {
          user_id: userId,
          task_id: parsedTaskId.data,
          queue_date: effectiveDate.data,
          sort_order: nextSortOrder,
        },
        {
          onConflict: "user_id,queue_date,task_id",
          ignoreDuplicates: true,
        },
      );

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      data: await listQueueForDate(supabase, userId, effectiveDate.data),
    };
  } catch (error) {
    logServerError({
      scope: "services.queue.addTaskToQueueForUser",
      userId,
      error,
      context: {
        taskId,
        queueDate: queueDate ?? null,
      },
    });
    return { success: false, error: ERROR_MUTATE };
  }
}

export async function removeTaskFromQueueForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  queueDate?: string | null,
): Promise<ServiceResult<TaskQueueRow[]>> {
  const normalizedTaskId = normalizeTaskIdInput(taskId);
  const parsedTaskId = taskIdSchema.safeParse(normalizedTaskId);
  if (!parsedTaskId.success) {
    return {
      success: false,
      error: parsedTaskId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const effectiveDate = await resolveQueueDateForUser(supabase, userId, queueDate);
    if (!effectiveDate.success) {
      return effectiveDate;
    }

    const task = await getOwnedTaskForQueue(supabase, userId, parsedTaskId.data);
    if (!task) {
      return { success: false, error: ERROR_TASK_NOT_FOUND };
    }

    const { error: deleteError } = await supabase
      .from("task_queue_items")
      .delete()
      .eq("user_id", userId)
      .eq("queue_date", effectiveDate.data)
      .eq("task_id", parsedTaskId.data);

    if (deleteError) {
      throw deleteError;
    }

    const remainingRows = await getQueueTableRows(supabase, userId, effectiveDate.data);
    await rewriteQueueOrder(
      supabase,
      userId,
      effectiveDate.data,
      remainingRows.map((row) => row.task_id),
    );

    return {
      success: true,
      data: await listQueueForDate(supabase, userId, effectiveDate.data),
    };
  } catch (error) {
    logServerError({
      scope: "services.queue.removeTaskFromQueueForUser",
      userId,
      error,
      context: {
        taskId: normalizedTaskId,
        queueDate: queueDate ?? null,
      },
    });
    return { success: false, error: ERROR_MUTATE };
  }
}

async function moveTaskQueueForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  direction: "up" | "down",
  queueDate?: string | null,
): Promise<ServiceResult<TaskQueueRow[]>> {
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  if (!parsedTaskId.success) {
    return {
      success: false,
      error: parsedTaskId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const effectiveDate = await resolveQueueDateForUser(supabase, userId, queueDate);
    if (!effectiveDate.success) {
      return effectiveDate;
    }

    const task = await getOwnedTaskForQueue(supabase, userId, parsedTaskId.data);
    if (!task) {
      return { success: false, error: ERROR_TASK_NOT_FOUND };
    }

    const rows = await getQueueTableRows(supabase, userId, effectiveDate.data);
    const currentIndex = rows.findIndex((row) => row.task_id === parsedTaskId.data);

    if (currentIndex === -1) {
      return {
        success: true,
        data: await hydrateQueueRows(supabase, userId, rows),
      };
    }

    const neighborIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (neighborIndex < 0 || neighborIndex >= rows.length) {
      return {
        success: true,
        data: await hydrateQueueRows(supabase, userId, rows),
      };
    }

    const orderedTaskIds = rows.map((row) => row.task_id);
    [orderedTaskIds[currentIndex], orderedTaskIds[neighborIndex]] = [
      orderedTaskIds[neighborIndex],
      orderedTaskIds[currentIndex],
    ];

    await rewriteQueueOrder(supabase, userId, effectiveDate.data, orderedTaskIds);

    return {
      success: true,
      data: await listQueueForDate(supabase, userId, effectiveDate.data),
    };
  } catch (error) {
    logServerError({
      scope: `services.queue.moveTaskQueue${direction === "up" ? "Up" : "Down"}ForUser`,
      userId,
      error,
      context: {
        taskId,
        queueDate: queueDate ?? null,
      },
    });
    return { success: false, error: ERROR_MUTATE };
  }
}

export function moveTaskQueueUpForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  queueDate?: string | null,
) {
  return moveTaskQueueForUser(supabase, userId, taskId, "up", queueDate);
}

export function moveTaskQueueDownForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  queueDate?: string | null,
) {
  return moveTaskQueueForUser(supabase, userId, taskId, "down", queueDate);
}
