"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectIdSchema, projectNameSchema } from "@/lib/validation/project.schema";
import { logServerError } from "@/lib/logging/logServerError";

export type ProjectRow = {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

type GetProjectsOptions = {
  includeArchived?: boolean;
};

export async function createProject(name: string): Promise<ActionResult<ProjectRow>> {
  const parsed = projectNameSchema.safeParse(name);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Nom invalide.",
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
      .from("projects")
      .insert({ user_id: userData.user.id, name: parsed.data })
      .select("id, name, archived_at, created_at")
      .single();

    if (error || !data) {
      logServerError({
        scope: "actions.projects.createProject",
        userId,
        error: error ?? new Error("Project insert returned no data."),
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible de creer le projet. Reessaie.",
      };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.projects.createProject",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function getProjects(
  options: GetProjectsOptions = {},
): Promise<ActionResult<ProjectRow[]>> {
  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "Tu dois etre connecte." };
    }

    userId = userData.user.id;
    const includeArchived = Boolean(options.includeArchived);

    let query = supabase
      .from("projects")
      .select("id, name, archived_at, created_at")
      .eq("user_id", userData.user.id);

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "actions.projects.getProjects",
        userId,
        error,
        context: { action: "select" },
      });
      return {
        success: false,
        error: "Impossible de charger les projets.",
      };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    logServerError({
      scope: "actions.projects.getProjects",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<ActionResult<ProjectRow>> {
  const parsedId = projectIdSchema.safeParse(projectId);
  const parsedName = projectNameSchema.safeParse(name);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Nom invalide.",
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
      .from("projects")
      .update({ name: parsedName.data })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id, name, archived_at, created_at")
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.projects.renameProject",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour le projet.",
      };
    }

    if (!data) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.projects.renameProject",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function setProjectArchived(
  projectId: string,
  archived: boolean,
): Promise<ActionResult<ProjectRow>> {
  const parsedId = projectIdSchema.safeParse(projectId);

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
    const archivedAt = archived ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("projects")
      .update({ archived_at: archivedAt })
      .eq("id", parsedId.data)
      .eq("user_id", userData.user.id)
      .select("id, name, archived_at, created_at")
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.projects.setProjectArchived",
        userId,
        error,
        context: { action: "update" },
      });
      return {
        success: false,
        error: "Impossible de mettre a jour le projet.",
      };
    }

    if (!data) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/tasks");

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "actions.projects.setProjectArchived",
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
