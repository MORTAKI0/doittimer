"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { taskIdSchema } from "@/lib/validation/task.schema";
import { logServerError } from "@/lib/logging/logServerError";

export type TaskQueueRow = {
  task_id: string;
  sort_order: number;
  created_at: string;
  title: string;
  completed: boolean;
  project_id: string | null;
  archived_at: string | null;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const ERROR_INVALID_ID = "Identifiant invalide.";
const ERROR_SIGN_IN = "Tu dois etre connecte.";
const ERROR_QUEUE_FULL = "Limite de 7 elements atteinte.";
const ERROR_TASK_NOT_FOUND = "Tache introuvable.";
const ERROR_LIST = "Impossible de charger la file.";
const ERROR_MUTATE = "Impossible de mettre a jour la file.";

function normalizeRpcList<T>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") return [data as T];
  return [];
}

function mapRpcError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("queue_full")) return ERROR_QUEUE_FULL;
  if (message.includes("task_not_found")) return ERROR_TASK_NOT_FOUND;
  return null;
}

export async function getTaskQueue(): Promise<ActionResult<TaskQueueRow[]>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: ERROR_SIGN_IN };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("task_queue_list");

    if (error) {
      logServerError({
        scope: "actions.queue.getTaskQueue",
        userId,
        error,
        context: { rpc: "task_queue_list" },
      });
      return { success: false, error: ERROR_LIST };
    }

    return { success: true, data: normalizeRpcList<TaskQueueRow>(data) };
  } catch (error) {
    logServerError({
      scope: "actions.queue.getTaskQueue",
      error,
    });
    return { success: false, error: ERROR_LIST };
  }
}

async function mutateQueue(
  rpc: string,
  taskId: string,
): Promise<ActionResult<TaskQueueRow[]>> {
  const parsedId = taskIdSchema.safeParse(taskId);

  if (!parsedId.success) {
    return { success: false, error: ERROR_INVALID_ID };
  }

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: ERROR_SIGN_IN };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc(rpc, {
      p_task_id: parsedId.data,
    });

    if (error) {
      const mapped = mapRpcError(error);
      if (mapped) return { success: false, error: mapped };
      logServerError({
        scope: "actions.queue.mutateQueue",
        userId,
        error,
        context: { rpc },
      });
      return { success: false, error: ERROR_MUTATE };
    }

    revalidatePath("/tasks");
    revalidatePath("/focus");

    return { success: true, data: normalizeRpcList<TaskQueueRow>(data) };
  } catch (error) {
    logServerError({
      scope: "actions.queue.mutateQueue",
      error,
      context: { rpc },
    });
    return { success: false, error: ERROR_MUTATE };
  }
}

export async function addTaskToQueue(
  taskId: string,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue("task_queue_add", taskId);
}

export async function removeTaskFromQueue(
  taskId: string,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue("task_queue_remove", taskId);
}

export async function moveTaskQueueUp(
  taskId: string,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue("task_queue_move_up", taskId);
}

export async function moveTaskQueueDown(
  taskId: string,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue("task_queue_move_down", taskId);
}
