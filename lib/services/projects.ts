import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import { projectIdSchema, projectNameSchema } from "@/lib/validation/project.schema";

export type ProjectRow = {
  id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
  source: string;
  read_only: boolean;
};

export type ProjectFilters = {
  includeArchived?: boolean;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

const PROJECT_SELECT = "id, name, archived_at, created_at, source, read_only";
const ERROR_READ_ONLY_PROJECT =
  "This project is managed in Notion. Edit it in Notion and sync again.";

async function assertProjectWritable(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, read_only")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false as const, error: "Project not found" };
  }

  if (data.read_only) {
    return { ok: false as const, error: ERROR_READ_ONLY_PROJECT };
  }

  return { ok: true as const };
}

export async function createProjectForUser(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string },
): Promise<ServiceResult<ProjectRow>> {
  const parsed = projectNameSchema.safeParse(input.name);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Nom invalide.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: userId, name: parsed.data })
      .select(PROJECT_SELECT)
      .single();

    if (error || !data) {
      logServerError({
        scope: "services.projects.createProjectForUser",
        userId,
        error: error ?? new Error("Project insert returned no data."),
        context: { action: "insert" },
      });
      return {
        success: false,
        error: "Impossible de creer le projet. Reessaie.",
      };
    }

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "services.projects.createProjectForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

const getProjectsForUserCached = cache(async function getProjectsForUserCached(
  supabase: SupabaseClient,
  userId: string,
  includeArchived: boolean,
): Promise<ServiceResult<ProjectRow[]>> {
  try {
    let query = supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", userId);

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      logServerError({
        scope: "services.projects.getProjectsForUser",
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
      scope: "services.projects.getProjectsForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
});

export async function getProjectsForUser(
  supabase: SupabaseClient,
  userId: string,
  filters: ProjectFilters = {},
): Promise<ServiceResult<ProjectRow[]>> {
  return getProjectsForUserCached(supabase, userId, Boolean(filters.includeArchived));
}

export async function renameProjectForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  name: string,
): Promise<ServiceResult<ProjectRow>> {
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
    const writableProject = await assertProjectWritable(supabase, userId, parsedId.data);
    if (!writableProject.ok) {
      return { success: false, error: writableProject.error };
    }

    const { data, error } = await supabase
      .from("projects")
      .update({ name: parsedName.data })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(PROJECT_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.projects.renameProjectForUser",
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

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "services.projects.renameProjectForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}

export async function setProjectArchivedForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  archived: boolean,
): Promise<ServiceResult<ProjectRow>> {
  const parsedId = projectIdSchema.safeParse(projectId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const writableProject = await assertProjectWritable(supabase, userId, parsedId.data);
    if (!writableProject.ok) {
      return { success: false, error: writableProject.error };
    }

    const archivedAt = archived ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("projects")
      .update({ archived_at: archivedAt })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(PROJECT_SELECT)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.projects.setProjectArchivedForUser",
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

    return { success: true, data };
  } catch (error) {
    logServerError({
      scope: "services.projects.setProjectArchivedForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Erreur reseau. Verifie ta connexion et reessaie.",
    };
  }
}
