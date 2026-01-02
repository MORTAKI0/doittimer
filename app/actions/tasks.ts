"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { taskIdSchema, taskTitleSchema } from "@/lib/validation/task.schema";

const DUPLICATE_WINDOW_MS = 10_000;

export type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function isRecentDuplicate(task: TaskRow | null) {
  if (!task?.created_at) return false;
  const createdAt = Date.parse(task.created_at);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < DUPLICATE_WINDOW_MS;
}

export async function createTask(title: string): Promise<ActionResult<TaskRow>> {
  const parsed = taskTitleSchema.safeParse(title);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Titre invalide.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id, title, completed, created_at")
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
      .insert({ user_id: userData.user.id, title: parsed.data })
      .select("id, title, completed, created_at")
      .single();

    if (error || !data) {
      return {
        success: false,
        error: "Impossible de creer la tache. Reessaie.",
      };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch {
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getTasks(): Promise<ActionResult<TaskRow[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, completed, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: "Impossible de charger les taches.",
      };
    }

    return { success: true, data: data ?? [] };
  } catch {
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
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id, title, completed, created_at")
      .maybeSingle();

    if (error) {
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
  } catch {
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
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ title: parsedTitle.data })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id, title, completed, created_at")
      .maybeSingle();

    if (error) {
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
  } catch {
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
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id")
      .maybeSingle();

    if (error) {
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
  } catch {
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
