"use server";

import { revalidatePath } from "next/cache";

import { requireSignedInUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/logging/logServerError";
import {
  createTaskForUser,
  deleteTaskForUser,
  getTaskPomodoroStatsForUser,
  getTasksForUser,
  hydrateTasksWithLabelsForUser,
  mapTaskRowsFromDb,
  restoreTaskForUser,
  setTaskCompletedForUser,
  setTaskScheduledForUser,
  TASK_SELECT,
  updateTaskForUser,
  updateTaskPomodoroOverridesForUser,
  updateTaskProjectForUser,
  updateTaskTitleForUser,
  type PaginatedTasks,
  type ServiceResult,
  type TaskEditableFields,
  type TaskFilters,
  type TaskLabel,
  type TaskPomodoroOverrides,
  type TaskPomodoroStats,
  type TaskRow,
} from "@/lib/services/tasks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { taskProjectIdSchema } from "@/lib/validation/task.schema";

export type {
  PaginatedTasks,
  TaskEditableFields,
  TaskFilters,
  TaskLabel,
  TaskPomodoroOverrides,
  TaskPomodoroStats,
  TaskRow,
} from "@/lib/services/tasks";

export type TaskNavigationSummary = {
  inboxCount: number;
  todayCount: number;
  projectCounts: Record<string, number>;
};

export type TodayTasksData = {
  today: string;
  tasks: TaskRow[];
};

export type UpcomingTasksData = {
  startDate: string;
  endDate: string;
  tasks: TaskRow[];
};

export type CompletedTasksData = {
  tasks: TaskRow[];
};

type ActionResult<T> = ServiceResult<T>;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateUTC(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

function revalidateTasksDashboard() {
  revalidatePath("/home");
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/completed");
}

function revalidateTasksDashboardFocusSettings() {
  revalidateTasksDashboard();
  revalidatePath("/focus");
  revalidatePath("/settings");
}

export async function createTask(
  title: string,
  projectId?: string | null,
  scheduledFor?: string | null,
): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.createTask", async (supabase, userId) => {
    const result = await createTaskForUser(supabase, userId, {
      title,
      projectId,
      scheduledFor,
    });

    if (result.success) {
      revalidateTasksDashboard();
    }

    return result;
  });
}

export async function getTasks(
  options: TaskFilters = {},
): Promise<ActionResult<PaginatedTasks>> {
  return runWithSignedInUser("actions.tasks.getTasks", (supabase, userId) =>
    getTasksForUser(supabase, userId, options),
  );
}

export async function getTaskPomodoroStats(
  taskId: string,
): Promise<ActionResult<TaskPomodoroStats>> {
  return runWithSignedInUser("actions.tasks.getTaskPomodoroStats", (supabase, userId) =>
    getTaskPomodoroStatsForUser(supabase, userId, taskId),
  );
}

export async function getTaskNavigationSummary(): Promise<ActionResult<TaskNavigationSummary>> {
  return runWithSignedInUser(
    "actions.tasks.getTaskNavigationSummary",
    async (supabase, userId) => {
      const today = formatDateUTC(new Date());

      const [inboxResult, todayResult, projectResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("project_id", null)
          .eq("completed", false)
          .is("archived_at", null),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", false)
          .is("archived_at", null)
          .eq("scheduled_for", today),
        supabase
          .from("tasks")
          .select("project_id")
          .eq("user_id", userId)
          .eq("completed", false)
          .is("archived_at", null)
          .not("project_id", "is", null),
      ]);

      if (inboxResult.error || todayResult.error || projectResult.error) {
        logServerError({
          scope: "actions.tasks.getTaskNavigationSummary",
          userId,
          error:
            inboxResult.error ??
            todayResult.error ??
            projectResult.error ??
            new Error("Unknown navigation summary error"),
        });
        return { success: false, error: "Impossible de charger les taches." };
      }

      const projectCounts = (projectResult.data ?? []).reduce<Record<string, number>>(
        (acc, row) => {
          if (typeof row.project_id !== "string") return acc;
          acc[row.project_id] = (acc[row.project_id] ?? 0) + 1;
          return acc;
        },
        {},
      );

      return {
        success: true,
        data: {
          inboxCount: inboxResult.count ?? 0,
          todayCount: todayResult.count ?? 0,
          projectCounts,
        },
      };
    },
  );
}

export async function getInboxTasks(): Promise<ActionResult<TaskRow[]>> {
  return runWithSignedInUser("actions.tasks.getInboxTasks", async (supabase, userId) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .is("project_id", null)
      .eq("completed", false)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "actions.tasks.getInboxTasks",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger les taches." };
    }

    return hydrateTasksWithLabelsForUser(supabase, userId, mapTaskRowsFromDb(data ?? []));
  });
}

export async function getTodayTasks(): Promise<ActionResult<TodayTasksData>> {
  return runWithSignedInUser("actions.tasks.getTodayTasks", async (supabase, userId) => {
    const today = formatDateUTC(new Date());

    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("completed", false)
      .is("archived_at", null)
      .not("scheduled_for", "is", null)
      .lte("scheduled_for", today)
      .order("scheduled_for", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "actions.tasks.getTodayTasks",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger les taches." };
    }

    const hydratedTasks = await hydrateTasksWithLabelsForUser(
      supabase,
      userId,
      mapTaskRowsFromDb(data ?? []),
    );

    if (!hydratedTasks.success) {
      return { success: false, error: hydratedTasks.error };
    }

    return {
      success: true,
      data: { today, tasks: hydratedTasks.data },
    };
  });
}

export async function getUpcomingTasks(days = 7): Promise<ActionResult<UpcomingTasksData>> {
  return runWithSignedInUser("actions.tasks.getUpcomingTasks", async (supabase, userId) => {
    const safeDays = Math.max(1, Math.min(30, Math.floor(days)));
    const startDate = formatDateUTC(new Date());
    const endDate = formatDateUTC(addDays(new Date(`${startDate}T00:00:00.000Z`), safeDays - 1));

    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("completed", false)
      .is("archived_at", null)
      .gte("scheduled_for", startDate)
      .lte("scheduled_for", endDate)
      .order("scheduled_for", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "actions.tasks.getUpcomingTasks",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger les taches." };
    }

    const hydratedTasks = await hydrateTasksWithLabelsForUser(
      supabase,
      userId,
      mapTaskRowsFromDb(data ?? []),
    );

    if (!hydratedTasks.success) {
      return { success: false, error: hydratedTasks.error };
    }

    return {
      success: true,
      data: {
        startDate,
        endDate,
        tasks: hydratedTasks.data,
      },
    };
  });
}

export async function getCompletedTasks(
  projectId?: string | null,
): Promise<ActionResult<CompletedTasksData>> {
  const parsedProjectId = taskProjectIdSchema.safeParse(projectId ?? null);

  if (!parsedProjectId.success) {
    return {
      success: false,
      error: parsedProjectId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  return runWithSignedInUser("actions.tasks.getCompletedTasks", async (supabase, userId) => {
    let query = supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", userId)
      .eq("completed", true)
      .not("completed_at", "is", null)
      .is("archived_at", null)
      .order("completed_at", { ascending: false });

    if (parsedProjectId.data) {
      query = query.eq("project_id", parsedProjectId.data);
    }

    const { data, error } = await query;

    if (error) {
      logServerError({
        scope: "actions.tasks.getCompletedTasks",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger les taches." };
    }

    const hydratedTasks = await hydrateTasksWithLabelsForUser(
      supabase,
      userId,
      mapTaskRowsFromDb(data ?? []),
    );

    if (!hydratedTasks.success) {
      return { success: false, error: hydratedTasks.error };
    }

    return {
      success: true,
      data: { tasks: hydratedTasks.data },
    };
  });
}

export async function setTaskScheduledFor(
  taskId: string,
  scheduledFor: string | null,
): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser(
    "actions.tasks.setTaskScheduledFor",
    async (supabase, userId) => {
      const result = await setTaskScheduledForUser(supabase, userId, taskId, scheduledFor);

      if (result.success) {
        revalidateTasksDashboard();
      }

      return result;
    },
  );
}

export async function setTaskCompleted(
  taskId: string,
  completed: boolean,
) : Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.setTaskCompleted", async (supabase, userId) => {
    const result = await setTaskCompletedForUser(supabase, userId, taskId, completed);

    if (result.success) {
      revalidateTasksDashboardFocusSettings();
    }

    return result;
  });
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
  return runWithSignedInUser("actions.tasks.updateTaskTitle", async (supabase, userId) => {
    const result = await updateTaskTitleForUser(supabase, userId, taskId, title);

    if (result.success) {
      revalidateTasksDashboard();
    }

    return result;
  });
}

export async function updateTaskDetails(
  taskId: string,
  fields: TaskEditableFields,
): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.updateTaskDetails", async (supabase, userId) => {
    const result = await updateTaskForUser(supabase, userId, taskId, fields);

    if (result.success) {
      revalidateTasksDashboardFocusSettings();
    }

    return result;
  });
}

export async function deleteTask(taskId: string): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.deleteTask", async (supabase, userId) => {
    const result = await deleteTaskForUser(supabase, userId, taskId);

    if (result.success) {
      revalidateTasksDashboard();
    }

    return result;
  });
}

export async function updateTaskProject(
  taskId: string,
  projectId?: string | null,
): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.updateTaskProject", async (supabase, userId) => {
    const result = await updateTaskProjectForUser(supabase, userId, taskId, projectId);

    if (result.success) {
      revalidateTasksDashboardFocusSettings();
    }

    return result;
  });
}

export async function restoreTask(taskId: string): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser("actions.tasks.restoreTask", async (supabase, userId) => {
    const result = await restoreTaskForUser(supabase, userId, taskId);

    if (result.success) {
      revalidateTasksDashboardFocusSettings();
    }

    return result;
  });
}

export async function updateTaskPomodoroOverrides(
  taskId: string,
  overrides: TaskPomodoroOverrides | null,
): Promise<ActionResult<TaskRow>> {
  return runWithSignedInUser(
    "actions.tasks.updateTaskPomodoroOverrides",
    async (supabase, userId) => {
      const result = await updateTaskPomodoroOverridesForUser(
        supabase,
        userId,
        taskId,
        overrides,
      );

      if (result.success) {
        revalidateTasksDashboard();
      }

      return result;
    },
  );
}
