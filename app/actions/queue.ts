"use server";

import { revalidatePath } from "next/cache";

import {
  addTaskToQueueForUser,
  getTaskQueueForUser,
  moveTaskQueueDownForUser,
  moveTaskQueueUpForUser,
  removeTaskFromQueueForUser,
  type ServiceResult,
  type TaskQueueRow,
} from "@/lib/services/queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T> = ServiceResult<T>;

const ERROR_SIGN_IN = "Tu dois etre connecte.";

export type { TaskQueueRow };

function todayDateOnly() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function requireActionAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { success: false as const, error: ERROR_SIGN_IN };
  }

  return {
    success: true as const,
    supabase,
    userId: userData.user.id,
  };
}

async function mutateQueue(
  action: (args: {
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    userId: string;
    queueDate?: string | null;
  }) => Promise<ActionResult<TaskQueueRow[]>>,
  queueDate?: string | null,
) {
  const auth = await requireActionAuth();
  if (!auth.success) {
    return { success: false as const, error: auth.error };
  }

  const result = await action({
    supabase: auth.supabase,
    userId: auth.userId,
    queueDate,
  });

  if (result.success) {
    revalidatePath("/tasks");
    revalidatePath("/focus");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function getTaskQueue(
  queueDate?: string | null,
): Promise<ActionResult<TaskQueueRow[]>> {
  const auth = await requireActionAuth();
  if (!auth.success) {
    return { success: false as const, error: auth.error };
  }

  return getTaskQueueForUser(auth.supabase, auth.userId, queueDate ?? todayDateOnly());
}

export async function addTaskToQueue(
  taskId: string,
  queueDate?: string | null,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue(
    ({ supabase, userId, queueDate: effectiveDate }) =>
      addTaskToQueueForUser(
        supabase,
        userId,
        taskId,
        effectiveDate ?? todayDateOnly(),
      ),
    queueDate ?? todayDateOnly(),
  );
}

export async function removeTaskFromQueue(
  taskId: string,
  queueDate?: string | null,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue(
    ({ supabase, userId, queueDate: effectiveDate }) =>
      removeTaskFromQueueForUser(
        supabase,
        userId,
        taskId,
        effectiveDate ?? todayDateOnly(),
      ),
    queueDate ?? todayDateOnly(),
  );
}

export async function moveTaskQueueUp(
  taskId: string,
  queueDate?: string | null,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue(
    ({ supabase, userId, queueDate: effectiveDate }) =>
      moveTaskQueueUpForUser(
        supabase,
        userId,
        taskId,
        effectiveDate ?? todayDateOnly(),
      ),
    queueDate ?? todayDateOnly(),
  );
}

export async function moveTaskQueueDown(
  taskId: string,
  queueDate?: string | null,
): Promise<ActionResult<TaskQueueRow[]>> {
  return mutateQueue(
    ({ supabase, userId, queueDate: effectiveDate }) =>
      moveTaskQueueDownForUser(
        supabase,
        userId,
        taskId,
        effectiveDate ?? todayDateOnly(),
      ),
    queueDate ?? todayDateOnly(),
  );
}
