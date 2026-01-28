// file: app/actions/notion.ts
"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/logging/logServerError";
import {
  notionDatabaseIdSchema,
  notionTokenSchema,
  normalizeNotionDatabaseId,
} from "@/lib/validation/notion.schema";
import {
  NotionApiError,
  createPage,
  getDatabase,
  queryDatabase,
  queryDatabaseByAppId,
  updatePage,
  type NotionDatabase,
  type NotionPage,
  type NotionPropertyValue,
} from "@/lib/notion/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type NotionConnectionSummary = {
  connected: boolean;
  last_synced_at: string | null;
  last_status: "success" | "error" | null;
  last_error: string | null;
};

export type NotionSyncSummary = {
  createdProjects: number;
  createdTasks: number;
  updatedProjects: number;
  updatedTasks: number;
  pulledProjects: number;
  pulledTasks: number;
  archivedProjects: number;
  restoredProjects: number;
  archivedTasks: number;
  restoredTasks: number;
  warnings: number;
  errors: number;
};

type ProjectRow = {
  id: string;
  name: string;
  archived_at: string | null;
  updated_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  project_id: string | null;
  archived_at: string | null;
  updated_at: string;
};

type ProjectMapRow = {
  project_id: string;
  notion_page_id: string;
  last_pulled_at: string | null;
};

type TaskMapRow = {
  task_id: string;
  notion_page_id: string;
  last_pulled_at: string | null;
};

type NotionProjectRecord = {
  pageId: string;
  appId: string | null;
  name: string;
  archived: boolean;
  lastEditedAt: string | null;
};

type NotionTaskRecord = {
  pageId: string;
  appId: string | null;
  title: string;
  completed: boolean;
  projectName: string;
  archived: boolean;
  lastEditedAt: string | null;
};

const REQUIRED_PROPERTIES = {
  name: "Name",
  type: "Type",
  completed: "Completed",
  project: "Project",
  archived: "Archived",
  appId: "App ID",
};

const TYPE_OPTIONS = ["Project", "Task"];
const CONCURRENCY_LIMIT = 3;

export async function getNotionConnection(): Promise<ActionResult<NotionConnectionSummary>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data, error } = await supabase
      .from("notion_connections")
      .select("last_synced_at, last_status, last_error")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "actions.notion.getNotionConnection",
        userId: userData.user.id,
        error,
        context: { action: "select" },
      });
      return { success: false, error: "Unable to load Notion connection." };
    }

    if (!data) {
      return {
        success: true,
        data: {
          connected: false,
          last_synced_at: null,
          last_status: null,
          last_error: null,
        },
      };
    }

    return {
      success: true,
      data: {
        connected: true,
        last_synced_at: data.last_synced_at ?? null,
        last_status: data.last_status ?? null,
        last_error: data.last_error ?? null,
      },
    };
  } catch (error) {
    logServerError({
      scope: "actions.notion.getNotionConnection",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export async function connectNotion(
  token: string,
  databaseId: string,
): Promise<ActionResult<NotionConnectionSummary>> {
  const parsedToken = notionTokenSchema.safeParse(token);
  const parsedDatabaseId = notionDatabaseIdSchema.safeParse(databaseId);

  if (!parsedToken.success) {
    return { success: false, error: parsedToken.error.issues[0]?.message ?? "Invalid token." };
  }

  if (!parsedDatabaseId.success) {
    return {
      success: false,
      error: parsedDatabaseId.error.issues[0]?.message ?? "Invalid database id.",
    };
  }

  const normalizedDatabaseId = normalizeNotionDatabaseId(parsedDatabaseId.data);

  if (!normalizedDatabaseId) {
    return { success: false, error: "Invalid database id." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data, error } = await supabase
      .from("notion_connections")
      .upsert(
        {
          user_id: userData.user.id,
          notion_token: parsedToken.data,
          notion_database_id: normalizedDatabaseId,
          last_status: null,
          last_error: null,
          last_synced_at: null,
        },
        { onConflict: "user_id" },
      )
      .select("last_synced_at, last_status, last_error")
      .single();

    if (error || !data) {
      logServerError({
        scope: "actions.notion.connectNotion",
        userId: userData.user.id,
        error: error ?? new Error("Notion connection upsert returned no data."),
        context: { action: "upsert" },
      });
      return { success: false, error: "Unable to connect Notion." };
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: {
        connected: true,
        last_synced_at: data.last_synced_at ?? null,
        last_status: data.last_status ?? null,
        last_error: data.last_error ?? null,
      },
    };
  } catch (error) {
    logServerError({
      scope: "actions.notion.connectNotion",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export async function disconnectNotion(): Promise<ActionResult<NotionConnectionSummary>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const userId = userData.user.id;

    const { error: deleteConnectionError } = await supabase
      .from("notion_connections")
      .delete()
      .eq("user_id", userId);

    if (deleteConnectionError) {
      logServerError({
        scope: "actions.notion.disconnectNotion",
        userId,
        error: deleteConnectionError,
        context: { action: "delete-connection" },
      });
      return { success: false, error: "Unable to disconnect Notion." };
    }

    await supabase.from("notion_task_map").delete().eq("user_id", userId);
    await supabase.from("notion_project_map").delete().eq("user_id", userId);

    revalidatePath("/settings");

    return {
      success: true,
      data: {
        connected: false,
        last_synced_at: null,
        last_status: null,
        last_error: null,
      },
    };
  } catch (error) {
    logServerError({
      scope: "actions.notion.disconnectNotion",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export async function syncNotionNow(): Promise<ActionResult<NotionSyncSummary>> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const userId = userData.user.id;

  const { data: connection, error: connectionError } = await supabase
    .from("notion_connections")
    .select("notion_token, notion_database_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (connectionError) {
    logServerError({
      scope: "actions.notion.syncNotionNow",
      userId,
      error: connectionError,
      context: { action: "select-connection" },
    });
    return { success: false, error: "Unable to load Notion connection." };
  }

  if (!connection) {
    return { success: false, error: "Connect Notion first." };
  }

  const parsedToken = notionTokenSchema.safeParse(connection.notion_token ?? "");
  const parsedDatabaseId = notionDatabaseIdSchema.safeParse(connection.notion_database_id ?? "");
  const normalizedDatabaseId = parsedDatabaseId.success
    ? normalizeNotionDatabaseId(parsedDatabaseId.data)
    : null;

  if (!parsedToken.success || !parsedDatabaseId.success || !normalizedDatabaseId) {
    const message = "Notion connection is invalid. Please reconnect.";
    await setNotionStatusError(supabase, userId, message);
    return { success: false, error: message };
  }

  const token = parsedToken.data;

  try {
    const database = await getDatabase({
      token,
      databaseId: normalizedDatabaseId,
    });
    const schemaError = validateNotionDatabaseSchema(database);

    if (schemaError) {
      await setNotionStatusError(supabase, userId, schemaError);
      return { success: false, error: schemaError };
    }

    const [
      { data: projects, error: projectsError },
      { data: tasks, error: tasksError },
      { data: projectMaps, error: projectMapsError },
      { data: taskMaps, error: taskMapsError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, archived_at, updated_at")
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("id, title, completed, project_id, archived_at, updated_at")
        .eq("user_id", userId),
      supabase
        .from("notion_project_map")
        .select("project_id, notion_page_id, last_pulled_at")
        .eq("user_id", userId),
      supabase
        .from("notion_task_map")
        .select("task_id, notion_page_id, last_pulled_at")
        .eq("user_id", userId),
    ]);

    if (projectsError) {
      logServerError({
        scope: "actions.notion.syncNotionNow",
        userId,
        error: projectsError,
        context: { action: "select-projects" },
      });
      const message = "Unable to load projects for Notion sync.";
      await setNotionStatusError(supabase, userId, message);
      return { success: false, error: message };
    }

    if (tasksError) {
      logServerError({
        scope: "actions.notion.syncNotionNow",
        userId,
        error: tasksError,
        context: { action: "select-tasks" },
      });
      const message = "Unable to load tasks for Notion sync.";
      await setNotionStatusError(supabase, userId, message);
      return { success: false, error: message };
    }

    if (projectMapsError) {
      logServerError({
        scope: "actions.notion.syncNotionNow",
        userId,
        error: projectMapsError,
        context: { action: "select-project-maps" },
      });
      const message = "Unable to load Notion project mappings.";
      await setNotionStatusError(supabase, userId, message);
      return { success: false, error: message };
    }

    if (taskMapsError) {
      logServerError({
        scope: "actions.notion.syncNotionNow",
        userId,
        error: taskMapsError,
        context: { action: "select-task-maps" },
      });
      const message = "Unable to load Notion task mappings.";
      await setNotionStatusError(supabase, userId, message);
      return { success: false, error: message };
    }

    const [notionProjectPages, notionTaskPages] = await Promise.all([
      queryDatabase({
        token,
        databaseId: normalizedDatabaseId,
        filter: {
          property: REQUIRED_PROPERTIES.type,
          select: { equals: "Project" },
        },
      }),
      queryDatabase({
        token,
        databaseId: normalizedDatabaseId,
        filter: {
          property: REQUIRED_PROPERTIES.type,
          select: { equals: "Task" },
        },
      }),
    ]);

    const notionProjects = notionProjectPages
      .map(parseNotionProjectRecord)
      .filter(Boolean) as NotionProjectRecord[];
    const notionTasks = notionTaskPages
      .map(parseNotionTaskRecord)
      .filter(Boolean) as NotionTaskRecord[];

    const projectById = new Map<string, ProjectRow>();
    const taskById = new Map<string, TaskRow>();
    const activeProjectsByName = new Map<string, string>();

    (projects ?? []).forEach((project) => {
      projectById.set(project.id, project);
      if (!project.archived_at) {
        activeProjectsByName.set(normalizeLookup(project.name), project.id);
      }
    });

    (tasks ?? []).forEach((task) => {
      taskById.set(task.id, task);
    });

    const projectMapByProjectId = new Map<string, ProjectMapRow>();
    (projectMaps ?? []).forEach((mapping) => {
      projectMapByProjectId.set(mapping.project_id, mapping);
    });

    const taskMapByTaskId = new Map<string, TaskMapRow>();
    (taskMaps ?? []).forEach((mapping) => {
      taskMapByTaskId.set(mapping.task_id, mapping);
    });

    const notionProjectsByPageId = new Map<string, NotionProjectRecord>();
    const notionProjectsByAppId = new Map<string, NotionProjectRecord>();
    const notionTasksByPageId = new Map<string, NotionTaskRecord>();
    const notionTasksByAppId = new Map<string, NotionTaskRecord>();

    notionProjects.forEach((record) => {
      notionProjectsByPageId.set(record.pageId, record);
      if (record.appId) {
        notionProjectsByAppId.set(record.appId, record);
      }
    });

    notionTasks.forEach((record) => {
      notionTasksByPageId.set(record.pageId, record);
      if (record.appId) {
        notionTasksByAppId.set(record.appId, record);
      }
    });

    const summary: NotionSyncSummary = {
      createdProjects: 0,
      createdTasks: 0,
      updatedProjects: 0,
      updatedTasks: 0,
      pulledProjects: 0,
      pulledTasks: 0,
      archivedProjects: 0,
      restoredProjects: 0,
      archivedTasks: 0,
      restoredTasks: 0,
      warnings: 0,
      errors: 0,
    };
    const errors: string[] = [];

    await runWithConcurrency(notionProjects, CONCURRENCY_LIMIT, async (record) => {
      try {
        const existing = record.appId ? projectById.get(record.appId) : null;
        if (existing) return;

        const normalizedName = normalizeProjectName(record.name);
        const archivedAt = record.archived ? new Date().toISOString() : null;
        const insertPayload: {
          id?: string;
          user_id: string;
          name: string;
          archived_at: string | null;
        } = {
          user_id: userId,
          name: normalizedName,
          archived_at: archivedAt,
        };
        if (record.appId && isUuid(record.appId)) {
          insertPayload.id = record.appId;
        }

        const { data: created, error: insertError } = await supabase
          .from("projects")
          .insert(insertPayload)
          .select("id, name, archived_at, updated_at")
          .single();

        if (insertError || !created) {
          throw insertError ?? new Error("Project insert failed.");
        }

        summary.pulledProjects += 1;

        projectById.set(created.id, created);
        if (!created.archived_at) {
          activeProjectsByName.set(normalizeLookup(created.name), created.id);
        }

        if (record.appId !== created.id) {
          await updatePage({
            token,
            pageId: record.pageId,
            properties: buildAppIdProperties(created.id),
          });
        }

        await upsertProjectMapping(
          supabase,
          userId,
          created.id,
          record.pageId,
          new Date().toISOString(),
        );
      } catch (error) {
        summary.errors += 1;
        errors.push(toSyncErrorMessage(error));
      }
    });

    await runWithConcurrency(projects ?? [], CONCURRENCY_LIMIT, async (project) => {
      try {
        const mapping = projectMapByProjectId.get(project.id) ?? null;
        let notionRecord = mapping
          ? notionProjectsByPageId.get(mapping.notion_page_id) ?? null
          : null;

        if (!notionRecord) {
          notionRecord = notionProjectsByAppId.get(project.id) ?? null;
          if (notionRecord && (!mapping || mapping.notion_page_id !== notionRecord.pageId)) {
            await upsertProjectMapping(
              supabase,
              userId,
              project.id,
              notionRecord.pageId,
              mapping?.last_pulled_at ?? null,
            );
          }
        }

        if (!notionRecord) {
          const existing = await queryDatabaseByAppId({
            token,
            databaseId: normalizedDatabaseId,
            appId: project.id,
          });
          const parsedExisting = existing ? parseNotionProjectRecord(existing) : null;
          if (parsedExisting) {
            notionRecord = parsedExisting;
            await upsertProjectMapping(
              supabase,
              userId,
              project.id,
              parsedExisting.pageId,
              mapping?.last_pulled_at ?? null,
            );
          }
        }

        if (!notionRecord) {
          const created = await createPage({
            token,
            databaseId: normalizedDatabaseId,
            properties: buildProjectProperties(project),
          });
          summary.createdProjects += 1;
          await upsertProjectMapping(supabase, userId, project.id, created.id, null);
          return;
        }

        const appUpdatedAtMs = toTimestamp(project.updated_at) ?? 0;
        const notionEditedAtMs = toTimestamp(notionRecord.lastEditedAt) ?? 0;
        const lastPulledAtMs = mapping?.last_pulled_at
          ? toTimestamp(mapping.last_pulled_at)
          : null;
        const notionEligible = lastPulledAtMs == null
          || (notionEditedAtMs != null && notionEditedAtMs > lastPulledAtMs);
        const notionNewer = notionEligible && notionEditedAtMs > appUpdatedAtMs;
        const appNewer = appUpdatedAtMs > notionEditedAtMs;

        if (notionNewer) {
          const normalizedName = normalizeProjectName(notionRecord.name);
          const nextArchived = notionRecord.archived;
          const wasArchived = Boolean(project.archived_at);
          const needsUpdate =
            normalizeLookup(project.name) !== normalizeLookup(normalizedName)
            || wasArchived !== nextArchived;

          if (needsUpdate) {
            const archivedAt = nextArchived ? new Date().toISOString() : null;
            const { data: updated, error: updateError } = await supabase
              .from("projects")
              .update({ name: normalizedName, archived_at: archivedAt })
              .eq("id", project.id)
              .eq("user_id", userId)
              .select("id, name, archived_at, updated_at")
              .single();

            if (updateError || !updated) {
              throw updateError ?? new Error("Project update failed.");
            }

            summary.pulledProjects += 1;
            if (!wasArchived && updated.archived_at) {
              summary.archivedProjects += 1;
            }
            if (wasArchived && !updated.archived_at) {
              summary.restoredProjects += 1;
            }

            if (!project.archived_at) {
              activeProjectsByName.delete(normalizeLookup(project.name));
            }
            projectById.set(updated.id, updated);
            if (!updated.archived_at) {
              activeProjectsByName.set(normalizeLookup(updated.name), updated.id);
            }

            await setProjectLastPulledAt(
              supabase,
              userId,
              project.id,
              new Date().toISOString(),
            );
          }
          return;
        }

        if (appNewer) {
          const appProjectProperties = buildProjectProperties(project);
          const needsUpdate =
            normalizeLookup(project.name) !== normalizeLookup(notionRecord.name)
            || Boolean(project.archived_at) !== notionRecord.archived;

          if (needsUpdate) {
            await updatePage({
              token,
              pageId: notionRecord.pageId,
              properties: appProjectProperties,
            });
            summary.updatedProjects += 1;
          }
        }
      } catch (error) {
        summary.errors += 1;
        errors.push(toSyncErrorMessage(error));
      }
    });

    await runWithConcurrency(notionTasks, CONCURRENCY_LIMIT, async (record) => {
      try {
        const existing = record.appId ? taskById.get(record.appId) : null;
        if (existing) return;

        const normalizedTitle = normalizeTaskTitle(record.title);
        const archivedAt = record.archived ? new Date().toISOString() : null;
        const { projectId, warning } = resolveProjectIdFromNotion(
          record.projectName,
          activeProjectsByName,
        );
        if (warning) {
          summary.warnings += 1;
        }

        const insertPayload: {
          id?: string;
          user_id: string;
          title: string;
          completed: boolean;
          project_id: string | null;
          archived_at: string | null;
        } = {
          user_id: userId,
          title: normalizedTitle,
          completed: record.completed,
          project_id: projectId,
          archived_at: archivedAt,
        };
        if (record.appId && isUuid(record.appId)) {
          insertPayload.id = record.appId;
        }

        const { data: created, error: insertError } = await supabase
          .from("tasks")
          .insert(insertPayload)
          .select("id, title, completed, project_id, archived_at, updated_at")
          .single();

        if (insertError || !created) {
          throw insertError ?? new Error("Task insert failed.");
        }

        summary.pulledTasks += 1;

        taskById.set(created.id, created);

        if (record.appId !== created.id) {
          await updatePage({
            token,
            pageId: record.pageId,
            properties: buildAppIdProperties(created.id),
          });
        }

        await upsertTaskMapping(
          supabase,
          userId,
          created.id,
          record.pageId,
          new Date().toISOString(),
        );
      } catch (error) {
        summary.errors += 1;
        errors.push(toSyncErrorMessage(error));
      }
    });

    await runWithConcurrency(tasks ?? [], CONCURRENCY_LIMIT, async (task) => {
      try {
        const mapping = taskMapByTaskId.get(task.id) ?? null;
        let notionRecord = mapping
          ? notionTasksByPageId.get(mapping.notion_page_id) ?? null
          : null;

        if (!notionRecord) {
          notionRecord = notionTasksByAppId.get(task.id) ?? null;
          if (notionRecord && (!mapping || mapping.notion_page_id !== notionRecord.pageId)) {
            await upsertTaskMapping(
              supabase,
              userId,
              task.id,
              notionRecord.pageId,
              mapping?.last_pulled_at ?? null,
            );
          }
        }

        if (!notionRecord) {
          const existing = await queryDatabaseByAppId({
            token,
            databaseId: normalizedDatabaseId,
            appId: task.id,
          });
          const parsedExisting = existing ? parseNotionTaskRecord(existing) : null;
          if (parsedExisting) {
            notionRecord = parsedExisting;
            await upsertTaskMapping(
              supabase,
              userId,
              task.id,
              parsedExisting.pageId,
              mapping?.last_pulled_at ?? null,
            );
          }
        }

        if (!notionRecord) {
          const projectName = task.project_id
            ? projectById.get(task.project_id)?.name ?? ""
            : "";
          const created = await createPage({
            token,
            databaseId: normalizedDatabaseId,
            properties: buildTaskProperties(task, projectName),
          });
          summary.createdTasks += 1;
          await upsertTaskMapping(supabase, userId, task.id, created.id, null);
          return;
        }

        const appUpdatedAtMs = toTimestamp(task.updated_at) ?? 0;
        const notionEditedAtMs = toTimestamp(notionRecord.lastEditedAt) ?? 0;
        const lastPulledAtMs = mapping?.last_pulled_at
          ? toTimestamp(mapping.last_pulled_at)
          : null;
        const notionEligible = lastPulledAtMs == null
          || (notionEditedAtMs != null && notionEditedAtMs > lastPulledAtMs);
        const notionNewer = notionEligible && notionEditedAtMs > appUpdatedAtMs;
        const appNewer = appUpdatedAtMs > notionEditedAtMs;

        if (notionNewer) {
          const normalizedTitle = normalizeTaskTitle(notionRecord.title);
          const nextArchived = notionRecord.archived;
          const wasArchived = Boolean(task.archived_at);
          const { projectId, warning } = resolveProjectIdFromNotion(
            notionRecord.projectName,
            activeProjectsByName,
          );
          if (warning) {
            summary.warnings += 1;
          }

          const needsUpdate =
            normalizeLookup(task.title) !== normalizeLookup(normalizedTitle)
            || task.completed !== notionRecord.completed
            || task.project_id !== projectId
            || wasArchived !== nextArchived;

          if (needsUpdate) {
            const archivedAt = nextArchived ? new Date().toISOString() : null;
            const { data: updated, error: updateError } = await supabase
              .from("tasks")
              .update({
                title: normalizedTitle,
                completed: notionRecord.completed,
                project_id: projectId,
                archived_at: archivedAt,
              })
              .eq("id", task.id)
              .eq("user_id", userId)
              .select("id, title, completed, project_id, archived_at, updated_at")
              .single();

            if (updateError || !updated) {
              throw updateError ?? new Error("Task update failed.");
            }

            summary.pulledTasks += 1;
            if (!wasArchived && updated.archived_at) {
              summary.archivedTasks += 1;
            }
            if (wasArchived && !updated.archived_at) {
              summary.restoredTasks += 1;
            }

            taskById.set(updated.id, updated);

            await setTaskLastPulledAt(
              supabase,
              userId,
              task.id,
              new Date().toISOString(),
            );
          }
          return;
        }

        if (appNewer) {
          const projectName = task.project_id
            ? projectById.get(task.project_id)?.name ?? ""
            : "";
          const needsUpdate =
            normalizeLookup(task.title) !== normalizeLookup(notionRecord.title)
            || task.completed !== notionRecord.completed
            || Boolean(task.archived_at) !== notionRecord.archived
            || normalizeLookup(projectName) !== normalizeLookup(notionRecord.projectName);

          if (needsUpdate) {
            await updatePage({
              token,
              pageId: notionRecord.pageId,
              properties: buildTaskProperties(task, projectName),
            });
            summary.updatedTasks += 1;
          }
        }
      } catch (error) {
        summary.errors += 1;
        errors.push(toSyncErrorMessage(error));
      }
    });

    if (errors.length > 0) {
      const message = "Notion sync completed with errors. Please try again.";
      await setNotionStatusError(supabase, userId, message);
      return { success: false, error: message };
    }

    await setNotionStatusSuccess(supabase, userId);
    revalidatePath("/settings");
    return { success: true, data: summary };
  } catch (error) {
    const message = mapNotionError(error);
    await setNotionStatusError(supabase, userId, message);
    logServerError({
      scope: "actions.notion.syncNotionNow",
      userId,
      error,
    });
    return { success: false, error: message };
  }
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeProjectName(value: string): string {
  const trimmed = value.trim();
  const safe = trimmed.length > 0 ? trimmed : "Untitled project";
  return safe.slice(0, 120);
}

function normalizeTaskTitle(value: string): string {
  const trimmed = value.trim();
  const safe = trimmed.length > 0 ? trimmed : "Untitled task";
  return safe.slice(0, 500);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAppIdProperties(appId: string): Record<string, NotionPropertyValue> {
  return {
    [REQUIRED_PROPERTIES.appId]: {
      rich_text: [{ text: { content: appId } }],
    },
  };
}

function getPropertyValue(
  properties: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | null {
  if (!properties) return null;
  const value = properties[key];
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readTitleValue(properties: Record<string, unknown> | undefined, key: string): string {
  const prop = getPropertyValue(properties, key);
  if (!prop || prop.type !== "title") return "";
  const items = Array.isArray(prop.title) ? prop.title : [];
  const text = items
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as { plain_text?: string; text?: { content?: string } };
        return record.plain_text ?? record.text?.content ?? "";
      }
      return "";
    })
    .join("");
  return text.trim();
}

function readRichTextValue(properties: Record<string, unknown> | undefined, key: string): string {
  const prop = getPropertyValue(properties, key);
  if (!prop || prop.type !== "rich_text") return "";
  const items = Array.isArray(prop.rich_text) ? prop.rich_text : [];
  const text = items
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as { plain_text?: string; text?: { content?: string } };
        return record.plain_text ?? record.text?.content ?? "";
      }
      return "";
    })
    .join("");
  return text.trim();
}

function readCheckboxValue(
  properties: Record<string, unknown> | undefined,
  key: string,
): boolean {
  const prop = getPropertyValue(properties, key);
  if (!prop || prop.type !== "checkbox") return false;
  return Boolean(prop.checkbox);
}

function parseNotionProjectRecord(page: NotionPage): NotionProjectRecord | null {
  const properties = page.properties;
  const name = readTitleValue(properties, REQUIRED_PROPERTIES.name);
  const appId = readRichTextValue(properties, REQUIRED_PROPERTIES.appId) || null;
  const archived = readCheckboxValue(properties, REQUIRED_PROPERTIES.archived);
  return {
    pageId: page.id,
    appId: appId && appId.trim() !== "" ? appId : null,
    name,
    archived,
    lastEditedAt: page.last_edited_time ?? null,
  };
}

function parseNotionTaskRecord(page: NotionPage): NotionTaskRecord | null {
  const properties = page.properties;
  const title = readTitleValue(properties, REQUIRED_PROPERTIES.name);
  const appId = readRichTextValue(properties, REQUIRED_PROPERTIES.appId) || null;
  const completed = readCheckboxValue(properties, REQUIRED_PROPERTIES.completed);
  const projectName = readRichTextValue(properties, REQUIRED_PROPERTIES.project);
  const archived = readCheckboxValue(properties, REQUIRED_PROPERTIES.archived);
  return {
    pageId: page.id,
    appId: appId && appId.trim() !== "" ? appId : null,
    title,
    completed,
    projectName,
    archived,
    lastEditedAt: page.last_edited_time ?? null,
  };
}

function resolveProjectIdFromNotion(
  projectName: string,
  activeProjectsByName: Map<string, string>,
): { projectId: string | null; warning: boolean } {
  const trimmed = projectName.trim();
  if (!trimmed) {
    return { projectId: null, warning: false };
  }
  const match = activeProjectsByName.get(normalizeLookup(trimmed));
  if (!match) {
    return { projectId: null, warning: true };
  }
  return { projectId: match, warning: false };
}

function buildProjectProperties(project: ProjectRow): Record<string, NotionPropertyValue> {
  return {
    [REQUIRED_PROPERTIES.name]: {
      title: [{ text: { content: project.name } }],
    },
    [REQUIRED_PROPERTIES.type]: {
      select: { name: "Project" },
    },
    [REQUIRED_PROPERTIES.completed]: {
      checkbox: false,
    },
    [REQUIRED_PROPERTIES.project]: {
      rich_text: [{ text: { content: project.name } }],
    },
    [REQUIRED_PROPERTIES.archived]: {
      checkbox: Boolean(project.archived_at),
    },
    [REQUIRED_PROPERTIES.appId]: {
      rich_text: [{ text: { content: project.id } }],
    },
  };
}

function buildTaskProperties(
  task: TaskRow,
  projectName: string,
): Record<string, NotionPropertyValue> {
  return {
    [REQUIRED_PROPERTIES.name]: {
      title: [{ text: { content: task.title } }],
    },
    [REQUIRED_PROPERTIES.type]: {
      select: { name: "Task" },
    },
    [REQUIRED_PROPERTIES.completed]: {
      checkbox: Boolean(task.completed),
    },
    [REQUIRED_PROPERTIES.project]: {
      rich_text: projectName ? [{ text: { content: projectName } }] : [],
    },
    [REQUIRED_PROPERTIES.archived]: {
      checkbox: Boolean(task.archived_at),
    },
    [REQUIRED_PROPERTIES.appId]: {
      rich_text: [{ text: { content: task.id } }],
    },
  };
}

async function upsertProjectMapping(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  projectId: string,
  notionPageId: string,
  lastPulledAt: string | null,
) {
  const { error } = await supabase
    .from("notion_project_map")
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        notion_page_id: notionPageId,
        last_pulled_at: lastPulledAt,
      },
      { onConflict: "project_id" },
    );

  if (error) {
    throw error;
  }
}

async function upsertTaskMapping(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  taskId: string,
  notionPageId: string,
  lastPulledAt: string | null,
) {
  const { error } = await supabase
    .from("notion_task_map")
    .upsert(
      {
        task_id: taskId,
        user_id: userId,
        notion_page_id: notionPageId,
        last_pulled_at: lastPulledAt,
      },
      { onConflict: "task_id" },
    );

  if (error) {
    throw error;
  }
}

async function setProjectLastPulledAt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  projectId: string,
  lastPulledAt: string,
) {
  const { error } = await supabase
    .from("notion_project_map")
    .update({ last_pulled_at: lastPulledAt })
    .eq("user_id", userId)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }
}

async function setTaskLastPulledAt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  taskId: string,
  lastPulledAt: string,
) {
  const { error } = await supabase
    .from("notion_task_map")
    .update({ last_pulled_at: lastPulledAt })
    .eq("user_id", userId)
    .eq("task_id", taskId);

  if (error) {
    throw error;
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  const size = Math.max(1, Math.min(limit, items.length));
  let index = 0;
  const workers = Array.from({ length: size }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) {
        break;
      }
      await worker(items[currentIndex]);
    }
  });
  await Promise.all(workers);
}

function validateNotionDatabaseSchema(database: NotionDatabase): string | null {
  const properties = database.properties ?? {};
  const errors: string[] = [];

  const nameProp = properties[REQUIRED_PROPERTIES.name];
  if (!nameProp || nameProp.type !== "title") {
    errors.push("Name (Title)");
  }

  const typeProp = properties[REQUIRED_PROPERTIES.type];
  if (!typeProp || typeProp.type !== "select") {
    errors.push("Type (Select)");
  } else {
    const options = typeProp.select?.options ?? [];
    const optionNames = options.map((option) => option.name).filter(Boolean);
    const missingType = TYPE_OPTIONS.filter((option) => !optionNames.includes(option));
    if (missingType.length > 0) {
      errors.push("Type options (Project, Task)");
    }
  }

  const completedProp = properties[REQUIRED_PROPERTIES.completed];
  if (!completedProp || completedProp.type !== "checkbox") {
    errors.push("Completed (Checkbox)");
  }

  const projectProp = properties[REQUIRED_PROPERTIES.project];
  if (!projectProp || projectProp.type !== "rich_text") {
    errors.push("Project (Rich text)");
  }

  const archivedProp = properties[REQUIRED_PROPERTIES.archived];
  if (!archivedProp || archivedProp.type !== "checkbox") {
    errors.push("Archived (Checkbox)");
  }

  const appIdProp = properties[REQUIRED_PROPERTIES.appId];
  if (!appIdProp || appIdProp.type !== "rich_text") {
    errors.push("App ID (Rich text)");
  }

  if (errors.length === 0) {
    return null;
  }

  return `Notion database is missing required properties: ${errors.join(", ")}.`;
}

function mapNotionError(error: unknown): string {
  if (error instanceof NotionApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Notion token is invalid or lacks access to the database.";
    }
    if (error.status === 404) {
      return "Notion database was not found.";
    }
    if (error.status === 429) {
      return "Notion rate limit exceeded. Please try again.";
    }
    if (error.status >= 500) {
      return "Notion API is unavailable. Please try again.";
    }
  }
  return "Notion sync failed. Please try again.";
}

function toSyncErrorMessage(error: unknown): string {
  if (error instanceof NotionApiError) {
    if (error.status === 404) {
      return "Notion page not found.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Notion authorization failed.";
    }
    if (error.status === 429) {
      return "Notion rate limit exceeded.";
    }
    if (error.status >= 500) {
      return "Notion API error.";
    }
  }
  return "Unexpected sync error.";
}

async function setNotionStatusSuccess(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  const { error } = await supabase
    .from("notion_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_status: "success",
      last_error: null,
    })
    .eq("user_id", userId);

  if (error) {
    logServerError({
      scope: "actions.notion.setNotionStatusSuccess",
      userId,
      error,
      context: { action: "update-status" },
    });
  }
}

async function setNotionStatusError(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  message: string,
) {
  const sanitized = message.trim().slice(0, 500);
  const { error } = await supabase
    .from("notion_connections")
    .update({
      last_status: "error",
      last_error: sanitized || "Notion sync failed.",
    })
    .eq("user_id", userId);

  if (error) {
    logServerError({
      scope: "actions.notion.setNotionStatusError",
      userId,
      error,
      context: { action: "update-status" },
    });
  }
}
