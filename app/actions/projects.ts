"use server";

import { revalidatePath } from "next/cache";

import { requireSignedInUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/logging/logServerError";
import {
  createProjectForUser,
  getProjectsForUser,
  renameProjectForUser,
  setProjectArchivedForUser,
  type ProjectFilters,
  type ProjectRow,
  type ServiceResult,
} from "@/lib/services/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type { ProjectRow } from "@/lib/services/projects";

type ActionResult<T> = ServiceResult<T>;

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

export async function createProject(name: string): Promise<ActionResult<ProjectRow>> {
  return runWithSignedInUser("actions.projects.createProject", async (supabase, userId) => {
    const result = await createProjectForUser(supabase, userId, { name });

    if (result.success) {
      revalidatePath("/tasks");
    }

    return result;
  });
}

export async function getProjects(
  options: ProjectFilters = {},
): Promise<ActionResult<ProjectRow[]>> {
  return runWithSignedInUser("actions.projects.getProjects", (supabase, userId) =>
    getProjectsForUser(supabase, userId, options),
  );
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<ActionResult<ProjectRow>> {
  return runWithSignedInUser("actions.projects.renameProject", async (supabase, userId) => {
    const result = await renameProjectForUser(supabase, userId, projectId, name);

    if (result.success) {
      revalidatePath("/tasks");
    }

    return result;
  });
}

export async function setProjectArchived(
  projectId: string,
  archived: boolean,
): Promise<ActionResult<ProjectRow>> {
  return runWithSignedInUser(
    "actions.projects.setProjectArchived",
    async (supabase, userId) => {
      const result = await setProjectArchivedForUser(supabase, userId, projectId, archived);

      if (result.success) {
        revalidatePath("/tasks");
      }

      return result;
    },
  );
}
