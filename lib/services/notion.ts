import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { envServer } from "@/lib/env.server";
import { logServerError } from "@/lib/logging/logServerError";
import {
  NotionApiError,
  getDatabase,
  queryDatabase,
  type NotionDatabase,
} from "@/lib/notion/client";
import { decryptNotionToken, encryptNotionToken } from "@/lib/notion/crypto";
import {
  buildProjectKey,
  collectImportedProjects,
  computeMissingImportedIds,
  normalizeNotionTaskPage,
  validateNotionImportSchema,
  type ImportedNotionProject,
  type ImportedNotionTask,
} from "@/lib/notion/import";
import {
  notionDatabaseIdSchema,
  notionTokenSchema,
  normalizeNotionDatabaseId,
} from "@/lib/validation/notion.schema";

export type NotionServiceErrorCode =
  | "not_connected"
  | "validation_error"
  | "upstream_error"
  | "internal_error";

export type NotionServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: NotionServiceErrorCode };

type ConnectionRow = {
  user_id: string;
  notion_token: string | null;
  notion_token_encrypted: string | null;
  notion_database_id: string | null;
  workspace_name: string | null;
  schema_version: number | null;
  last_synced_at: string | null;
  last_status: "success" | "error" | "running" | null;
  last_error: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  archived_at: string | null;
  source: string;
  read_only: boolean;
};

type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  project_id: string | null;
  scheduled_for: string | null;
  archived_at: string | null;
  source: string;
  read_only: boolean;
};

type ProjectMapRow = {
  project_id: string;
  notion_project_key: string | null;
};

type TaskMapRow = {
  task_id: string;
  notion_page_id: string;
};

const NOTION_SCHEMA_VERSION = 1;
const NOTION_SOURCE = "notion";
const READ_ONLY_IMPORT = true;

export type NotionConnectionSummary = {
  connected: boolean;
  database_id: string | null;
  workspace_name: string | null;
  schema_version: number | null;
  has_saved_token: boolean;
  last_synced_at: string | null;
  last_status: "success" | "error" | "running" | null;
  last_error: string | null;
};

export type NotionValidationSummary = {
  database_id: string;
  database_title: string | null;
  workspace_name: string | null;
};

export type NotionSyncSummary = {
  createdProjects: number;
  updatedProjects: number;
  archivedProjects: number;
  restoredProjects: number;
  createdTasks: number;
  updatedTasks: number;
  archivedTasks: number;
  restoredTasks: number;
  warnings: number;
};

function getDatabaseTitle(database: NotionDatabase) {
  return database.title?.map((item) => item.plain_text ?? "").join("").trim() || null;
}

function sanitizeMessage(message: string) {
  return message
    .replace(/secret_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .trim()
    .slice(0, 500);
}

function isUpstreamError(error: unknown) {
  return error instanceof NotionApiError || error instanceof TypeError;
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

  return "Notion request failed. Please try again.";
}

function buildConnectionSummary(connection: ConnectionRow | null): NotionConnectionSummary {
  const hasSavedToken = Boolean(connection?.notion_token_encrypted || connection?.notion_token);

  return {
    connected: Boolean(connection?.notion_database_id && hasSavedToken),
    database_id: connection?.notion_database_id ?? null,
    workspace_name: connection?.workspace_name ?? null,
    schema_version: connection?.schema_version ?? null,
    has_saved_token: hasSavedToken,
    last_synced_at: connection?.last_synced_at ?? null,
    last_status: connection?.last_status ?? null,
    last_error: connection?.last_error ?? null,
  };
}

async function getConnectionRow(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notion_connections")
    .select(
      "user_id, notion_token, notion_token_encrypted, notion_database_id, workspace_name, schema_version, last_synced_at, last_status, last_error",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ConnectionRow | null;
}

async function maybeMigratePlaintextToken(
  supabase: SupabaseClient,
  userId: string,
  connection: ConnectionRow,
  token: string,
) {
  if (connection.notion_token_encrypted || !connection.notion_token) {
    return;
  }

  const encrypted = encryptNotionToken(token, envServer.NOTION_TOKEN_ENCRYPTION_KEY);
  await supabase
    .from("notion_connections")
    .update({ notion_token_encrypted: encrypted, notion_token: null })
    .eq("user_id", userId);
}

async function resolveTokenInput(
  supabase: SupabaseClient,
  userId: string,
  connection: ConnectionRow | null,
  tokenInput: string,
) {
  const trimmed = tokenInput.trim();

  if (trimmed) {
    const parsedToken = notionTokenSchema.safeParse(trimmed);
    if (!parsedToken.success) {
      return {
        error: parsedToken.error.issues[0]?.message ?? "Notion token is invalid.",
        token: null,
      };
    }

    return { error: null, token: parsedToken.data };
  }

  if (!connection) {
    return { error: "Notion token is required.", token: null };
  }

  if (connection.notion_token_encrypted) {
    try {
      return {
        error: null,
        token: decryptNotionToken(
          connection.notion_token_encrypted,
          envServer.NOTION_TOKEN_ENCRYPTION_KEY,
        ),
      };
    } catch (error) {
      logServerError({
        scope: "services.notion.resolveTokenInput",
        userId,
        error,
        context: { action: "decrypt-token" },
      });
      return { error: "Stored Notion token is invalid. Please reconnect.", token: null };
    }
  }

  if (connection.notion_token) {
    const parsedToken = notionTokenSchema.safeParse(connection.notion_token);
    if (!parsedToken.success) {
      return { error: "Stored Notion token is invalid. Please reconnect.", token: null };
    }

    await maybeMigratePlaintextToken(supabase, userId, connection, parsedToken.data);
    return { error: null, token: parsedToken.data };
  }

  return { error: "Notion token is required.", token: null };
}

function resolveDatabaseIdInput(connection: ConnectionRow | null, databaseIdInput: string) {
  const candidate = databaseIdInput.trim() || connection?.notion_database_id || "";
  const parsed = notionDatabaseIdSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Notion database id is invalid.",
      databaseId: null,
    };
  }

  const normalized = normalizeNotionDatabaseId(parsed.data);
  if (!normalized) {
    return { error: "Notion database id is invalid.", databaseId: null };
  }

  return { error: null, databaseId: normalized };
}

async function validateDatabaseAccess(token: string, databaseId: string) {
  const database = await getDatabase({ token, databaseId });
  const schemaError = validateNotionImportSchema(database);

  if (schemaError) {
    return { error: schemaError, database: null as NotionDatabase | null };
  }

  return { error: null, database };
}

async function setConnectionStatus(
  supabase: SupabaseClient,
  userId: string,
  status: "success" | "error" | "running",
  errorMessage?: string | null,
) {
  const payload: {
    last_status: "success" | "error" | "running";
    last_error: string | null;
    last_synced_at?: string;
  } = {
    last_status: status,
    last_error: errorMessage ? sanitizeMessage(errorMessage) : null,
  };

  if (status === "success") {
    payload.last_synced_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("notion_connections")
    .update(payload)
    .eq("user_id", userId);

  if (error) {
    logServerError({
      scope: "services.notion.setConnectionStatus",
      userId,
      error,
      context: { status },
    });
  }
}

async function recordSyncRun(
  supabase: SupabaseClient,
  userId: string,
  status: "success" | "error",
  summary: NotionSyncSummary | null,
  errorMessage?: string,
) {
  const { error } = await supabase.from("notion_sync_runs").insert({
    user_id: userId,
    status,
    summary,
    error: errorMessage ? sanitizeMessage(errorMessage) : null,
  });

  if (error) {
    logServerError({
      scope: "services.notion.recordSyncRun",
      userId,
      error,
      context: { status },
    });
  }
}

async function hydrateDatabaseNameIfMissing(
  supabase: SupabaseClient,
  userId: string,
  connection: ConnectionRow | null,
) {
  if (
    !connection ||
    connection.workspace_name ||
    !connection.notion_database_id ||
    (!connection.notion_token && !connection.notion_token_encrypted)
  ) {
    return connection;
  }

  try {
    const tokenResult = await resolveTokenInput(supabase, userId, connection, "");
    if (tokenResult.error || !tokenResult.token) {
      return connection;
    }

    const database = await getDatabase({
      token: tokenResult.token,
      databaseId: connection.notion_database_id,
    });
    const databaseTitle = getDatabaseTitle(database);

    if (!databaseTitle) {
      return connection;
    }

    const { error } = await supabase
      .from("notion_connections")
      .update({ workspace_name: databaseTitle })
      .eq("user_id", userId);

    if (error) {
      return connection;
    }

    return {
      ...connection,
      workspace_name: databaseTitle,
    };
  } catch {
    return connection;
  }
}

export async function getNotionConnectionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotionServiceResult<NotionConnectionSummary>> {
  try {
    const connection = await hydrateDatabaseNameIfMissing(
      supabase,
      userId,
      await getConnectionRow(supabase, userId),
    );

    return {
      success: true,
      data: buildConnectionSummary(connection),
    };
  } catch (error) {
    logServerError({
      scope: "services.notion.getNotionConnectionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Unable to load Notion connection.",
      code: "internal_error",
    };
  }
}

export async function validateNotionConnectionForUser(
  supabase: SupabaseClient,
  userId: string,
  tokenInput: string,
  databaseIdInput: string,
): Promise<NotionServiceResult<NotionValidationSummary>> {
  try {
    const connection = await getConnectionRow(supabase, userId);
    const tokenResult = await resolveTokenInput(supabase, userId, connection, tokenInput);
    if (tokenResult.error || !tokenResult.token) {
      return {
        success: false,
        error: tokenResult.error ?? "Notion token is required.",
        code: "validation_error",
      };
    }

    const databaseResult = resolveDatabaseIdInput(connection, databaseIdInput);
    if (databaseResult.error || !databaseResult.databaseId) {
      return {
        success: false,
        error: databaseResult.error ?? "Notion database id is invalid.",
        code: "validation_error",
      };
    }

    const validation = await validateDatabaseAccess(tokenResult.token, databaseResult.databaseId);
    if (validation.error || !validation.database) {
      return {
        success: false,
        error: validation.error ?? "Unable to validate Notion database.",
        code: "validation_error",
      };
    }

    const databaseTitle = getDatabaseTitle(validation.database);
    return {
      success: true,
      data: {
        database_id: databaseResult.databaseId,
        database_title: databaseTitle,
        workspace_name: databaseTitle,
      },
    };
  } catch (error) {
    const message = mapNotionError(error);
    logServerError({
      scope: "services.notion.validateNotionConnectionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: message,
      code: isUpstreamError(error) ? "upstream_error" : "internal_error",
    };
  }
}

export async function saveNotionConnectionForUser(
  supabase: SupabaseClient,
  userId: string,
  tokenInput: string,
  databaseIdInput: string,
): Promise<NotionServiceResult<NotionConnectionSummary>> {
  try {
    const existing = await getConnectionRow(supabase, userId);
    const tokenResult = await resolveTokenInput(supabase, userId, existing, tokenInput);
    if (tokenResult.error || !tokenResult.token) {
      return {
        success: false,
        error: tokenResult.error ?? "Notion token is required.",
        code: "validation_error",
      };
    }

    const databaseResult = resolveDatabaseIdInput(existing, databaseIdInput);
    if (databaseResult.error || !databaseResult.databaseId) {
      return {
        success: false,
        error: databaseResult.error ?? "Notion database id is invalid.",
        code: "validation_error",
      };
    }

    const validation = await validateDatabaseAccess(tokenResult.token, databaseResult.databaseId);
    if (validation.error || !validation.database) {
      return {
        success: false,
        error: validation.error ?? "Unable to validate Notion database.",
        code: "validation_error",
      };
    }

    const encryptedToken = encryptNotionToken(
      tokenResult.token,
      envServer.NOTION_TOKEN_ENCRYPTION_KEY,
    );
    const databaseTitle = getDatabaseTitle(validation.database);
    const payload = {
      user_id: userId,
      notion_token: null,
      notion_token_encrypted: encryptedToken,
      notion_database_id: databaseResult.databaseId,
      workspace_name: databaseTitle,
      schema_version: NOTION_SCHEMA_VERSION,
      last_status: null,
      last_error: null,
    };

    const { error: upsertError } = await supabase
      .from("notion_connections")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertError) {
      throw upsertError;
    }

    return {
      success: true,
      data: buildConnectionSummary({
        user_id: userId,
        notion_token: null,
        notion_token_encrypted: encryptedToken,
        notion_database_id: databaseResult.databaseId,
        workspace_name: databaseTitle,
        schema_version: NOTION_SCHEMA_VERSION,
        last_synced_at: existing?.last_synced_at ?? null,
        last_status: null,
        last_error: null,
      }),
    };
  } catch (error) {
    const message = mapNotionError(error);
    logServerError({
      scope: "services.notion.saveNotionConnectionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: message,
      code: isUpstreamError(error) ? "upstream_error" : "internal_error",
    };
  }
}

export async function disconnectNotionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotionServiceResult<NotionConnectionSummary>> {
  try {
    const { error } = await supabase.from("notion_connections").delete().eq("user_id", userId);

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: {
        connected: false,
        database_id: null,
        workspace_name: null,
        schema_version: null,
        has_saved_token: false,
        last_synced_at: null,
        last_status: null,
        last_error: null,
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.notion.disconnectNotionForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: "Unable to disconnect Notion.",
      code: "internal_error",
    };
  }
}

async function upsertProjectMap(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  notionProjectKey: string,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("notion_project_map").upsert(
    {
      user_id: userId,
      project_id: projectId,
      notion_project_key: notionProjectKey,
      last_pulled_at: now,
    },
    { onConflict: "user_id,project_id" },
  );

  if (error) {
    throw error;
  }
}

async function upsertTaskMap(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  notionPageId: string,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("notion_task_map").upsert(
    {
      user_id: userId,
      task_id: taskId,
      notion_page_id: notionPageId,
      last_pulled_at: now,
    },
    { onConflict: "user_id,task_id" },
  );

  if (error) {
    throw error;
  }
}

async function archiveMissingProjects(
  supabase: SupabaseClient,
  userId: string,
  missingProjectIds: string[],
) {
  let archivedCount = 0;

  for (const projectId of missingProjectIds) {
    const { data, error } = await supabase
      .from("projects")
      .update({
        archived_at: new Date().toISOString(),
        source: NOTION_SOURCE,
        read_only: READ_ONLY_IMPORT,
      })
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      archivedCount += 1;
    }
  }

  return archivedCount;
}

async function archiveMissingTasks(
  supabase: SupabaseClient,
  userId: string,
  missingTaskIds: string[],
) {
  let archivedCount = 0;

  for (const taskId of missingTaskIds) {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        archived_at: new Date().toISOString(),
        source: NOTION_SOURCE,
        read_only: READ_ONLY_IMPORT,
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      archivedCount += 1;
    }
  }

  return archivedCount;
}

async function syncProjects(
  supabase: SupabaseClient,
  userId: string,
  importedProjects: ImportedNotionProject[],
  localProjects: ProjectRow[],
  projectMaps: ProjectMapRow[],
  summary: NotionSyncSummary,
) {
  const projectIdByKey = new Map<string, string>();
  const seenProjectIds = new Set<string>();
  const localProjectById = new Map(localProjects.map((project) => [project.id, project]));
  const localImportedProjectByKey = new Map(
    localProjects
      .filter((project) => project.source === NOTION_SOURCE)
      .map((project) => [buildProjectKey(project.name), project]),
  );
  const projectMapByKey = new Map(
    projectMaps
      .filter(
        (row): row is ProjectMapRow & { notion_project_key: string } =>
          Boolean(row.notion_project_key),
      )
      .map((row) => [row.notion_project_key, row.project_id]),
  );

  for (const importedProject of importedProjects) {
    const mappedProjectId = projectMapByKey.get(importedProject.key) ?? null;
    const existingProject = mappedProjectId
      ? localProjectById.get(mappedProjectId) ?? null
      : localImportedProjectByKey.get(importedProject.key) ?? null;

    if (!existingProject) {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: importedProject.name,
          archived_at: null,
          source: NOTION_SOURCE,
          read_only: READ_ONLY_IMPORT,
        })
        .select("id, name, archived_at, source, read_only")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create imported project.");
      }

      await upsertProjectMap(supabase, userId, data.id, importedProject.key);
      projectIdByKey.set(importedProject.key, data.id);
      seenProjectIds.add(data.id);
      summary.createdProjects += 1;
      continue;
    }

    const nextPayload = {
      name: importedProject.name,
      archived_at: null,
      source: NOTION_SOURCE,
      read_only: READ_ONLY_IMPORT,
    };
    const needsUpdate =
      existingProject.name !== nextPayload.name ||
      existingProject.archived_at !== nextPayload.archived_at ||
      existingProject.source !== nextPayload.source ||
      existingProject.read_only !== nextPayload.read_only;

    if (needsUpdate) {
      const { data, error } = await supabase
        .from("projects")
        .update(nextPayload)
        .eq("id", existingProject.id)
        .eq("user_id", userId)
        .select("id, archived_at")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to update imported project.");
      }

      summary.updatedProjects += 1;
      if (existingProject.archived_at && !data.archived_at) {
        summary.restoredProjects += 1;
      }
    }

    await upsertProjectMap(supabase, userId, existingProject.id, importedProject.key);
    projectIdByKey.set(importedProject.key, existingProject.id);
    seenProjectIds.add(existingProject.id);
  }

  const missingProjectIds = computeMissingImportedIds(
    projectMaps
      .filter((row) => Boolean(row.notion_project_key))
      .map((row) => row.project_id),
    seenProjectIds,
  );
  summary.archivedProjects += await archiveMissingProjects(supabase, userId, missingProjectIds);

  return projectIdByKey;
}

async function syncTasks(
  supabase: SupabaseClient,
  userId: string,
  importedTasks: ImportedNotionTask[],
  localTasks: TaskRow[],
  taskMaps: TaskMapRow[],
  projectIdByKey: Map<string, string>,
  summary: NotionSyncSummary,
) {
  const localTaskById = new Map(localTasks.map((task) => [task.id, task]));
  const taskMapByPageId = new Map(taskMaps.map((row) => [row.notion_page_id, row.task_id]));
  const seenTaskIds = new Set<string>();

  for (const importedTask of importedTasks) {
    const projectId = projectIdByKey.get(importedTask.projectKey) ?? null;

    if (!projectId) {
      summary.warnings += 1;
      continue;
    }

    const existingTaskId = taskMapByPageId.get(importedTask.notionPageId) ?? null;
    const existingTask = existingTaskId ? localTaskById.get(existingTaskId) ?? null : null;
    const archivedAt = importedTask.archived
      ? existingTask?.archived_at ?? new Date().toISOString()
      : null;

    if (!existingTask) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: importedTask.title,
          completed: importedTask.completed,
          project_id: projectId,
          scheduled_for: importedTask.scheduledFor,
          archived_at: archivedAt,
          source: NOTION_SOURCE,
          read_only: READ_ONLY_IMPORT,
        })
        .select("id, title, completed, project_id, scheduled_for, archived_at, source, read_only")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create imported task.");
      }

      await upsertTaskMap(supabase, userId, data.id, importedTask.notionPageId);
      seenTaskIds.add(data.id);
      summary.createdTasks += 1;
      continue;
    }

    const nextPayload = {
      title: importedTask.title,
      completed: importedTask.completed,
      project_id: projectId,
      scheduled_for: importedTask.scheduledFor,
      archived_at: archivedAt,
      source: NOTION_SOURCE,
      read_only: READ_ONLY_IMPORT,
    };

    const needsUpdate =
      existingTask.title !== nextPayload.title ||
      existingTask.completed !== nextPayload.completed ||
      existingTask.project_id !== nextPayload.project_id ||
      existingTask.scheduled_for !== nextPayload.scheduled_for ||
      existingTask.archived_at !== nextPayload.archived_at ||
      existingTask.source !== nextPayload.source ||
      existingTask.read_only !== nextPayload.read_only;

    if (needsUpdate) {
      const { data, error } = await supabase
        .from("tasks")
        .update(nextPayload)
        .eq("id", existingTask.id)
        .eq("user_id", userId)
        .select("id, archived_at")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to update imported task.");
      }

      summary.updatedTasks += 1;
      if (existingTask.archived_at && !data.archived_at) {
        summary.restoredTasks += 1;
      }
    }

    await upsertTaskMap(supabase, userId, existingTask.id, importedTask.notionPageId);
    seenTaskIds.add(existingTask.id);
  }

  const missingTaskIds = computeMissingImportedIds(
    taskMaps.map((row) => row.task_id),
    seenTaskIds,
  );
  summary.archivedTasks += await archiveMissingTasks(supabase, userId, missingTaskIds);
}

export async function runNotionImportForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotionServiceResult<NotionSyncSummary>> {
  try {
    const connection = await getConnectionRow(supabase, userId);
    if (!connection?.notion_database_id) {
      return {
        success: false,
        error: "Notion connection is not configured.",
        code: "not_connected",
      };
    }

    const tokenResult = await resolveTokenInput(supabase, userId, connection, "");
    if (tokenResult.error || !tokenResult.token) {
      await setConnectionStatus(
        supabase,
        userId,
        "error",
        tokenResult.error ?? "Stored Notion token is invalid.",
      );
      return {
        success: false,
        error: tokenResult.error ?? "Stored Notion token is invalid.",
        code: "not_connected",
      };
    }

    const databaseResult = resolveDatabaseIdInput(connection, "");
    if (databaseResult.error || !databaseResult.databaseId) {
      await setConnectionStatus(
        supabase,
        userId,
        "error",
        databaseResult.error ?? "Stored Notion database id is invalid.",
      );
      return {
        success: false,
        error: databaseResult.error ?? "Stored Notion database id is invalid.",
        code: "not_connected",
      };
    }

    await setConnectionStatus(supabase, userId, "running");

    const validation = await validateDatabaseAccess(tokenResult.token, databaseResult.databaseId);
    if (validation.error || !validation.database) {
      await setConnectionStatus(
        supabase,
        userId,
        "error",
        validation.error ?? "Unable to validate Notion database.",
      );
      return {
        success: false,
        error: validation.error ?? "Unable to validate Notion database.",
        code: "validation_error",
      };
    }

    const pages = await queryDatabase({
      token: tokenResult.token,
      databaseId: databaseResult.databaseId,
    });
    const importedTasks = pages
      .map(normalizeNotionTaskPage)
      .filter((task): task is ImportedNotionTask => Boolean(task));
    const importedProjects = collectImportedProjects(importedTasks);
    const skippedPages = Math.max(0, pages.length - importedTasks.length);

    const [
      { data: localProjects, error: projectsError },
      { data: localTasks, error: tasksError },
      { data: projectMaps, error: projectMapsError },
      { data: taskMaps, error: taskMapsError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, archived_at, source, read_only")
        .eq("user_id", userId),
      supabase
        .from("tasks")
        .select("id, title, completed, project_id, scheduled_for, archived_at, source, read_only")
        .eq("user_id", userId),
      supabase
        .from("notion_project_map")
        .select("project_id, notion_project_key")
        .eq("user_id", userId),
      supabase
        .from("notion_task_map")
        .select("task_id, notion_page_id")
        .eq("user_id", userId),
    ]);

    if (projectsError || tasksError || projectMapsError || taskMapsError) {
      throw projectsError ?? tasksError ?? projectMapsError ?? taskMapsError;
    }

    const summary: NotionSyncSummary = {
      createdProjects: 0,
      updatedProjects: 0,
      archivedProjects: 0,
      restoredProjects: 0,
      createdTasks: 0,
      updatedTasks: 0,
      archivedTasks: 0,
      restoredTasks: 0,
      warnings: skippedPages,
    };

    const projectIdByKey = await syncProjects(
      supabase,
      userId,
      importedProjects,
      (localProjects ?? []) as ProjectRow[],
      (projectMaps ?? []) as ProjectMapRow[],
      summary,
    );

    await syncTasks(
      supabase,
      userId,
      importedTasks,
      (localTasks ?? []) as TaskRow[],
      (taskMaps ?? []) as TaskMapRow[],
      projectIdByKey,
      summary,
    );

    await supabase
      .from("notion_connections")
      .update({ workspace_name: getDatabaseTitle(validation.database) })
      .eq("user_id", userId);

    await setConnectionStatus(supabase, userId, "success");
    await recordSyncRun(supabase, userId, "success", summary);

    return { success: true, data: summary };
  } catch (error) {
    const message = mapNotionError(error);

    try {
      await setConnectionStatus(supabase, userId, "error", message);
      await recordSyncRun(supabase, userId, "error", null, message);
    } catch {
      // Best effort only.
    }

    logServerError({
      scope: "services.notion.runNotionImportForUser",
      userId,
      error,
    });
    return {
      success: false,
      error: message,
      code: isUpstreamError(error) ? "upstream_error" : "internal_error",
    };
  }
}
