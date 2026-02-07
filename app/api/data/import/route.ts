import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/logging/logServerError";
import { ImportParseError, parseXlsxExport, parseZipExport } from "@/lib/import/parse";
import { mapError } from "@/lib/errors/mapError";

export const runtime = "nodejs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK_SIZE = 250;

type ImportCounts = {
  projects: number;
  tasks: number;
  sessions: number;
  events: number;
  queue: number;
  settings: number;
};

type Manifest = {
  schema_version?: string | number | null;
  app?: string | null;
};

function jsonError(
  message: string,
  status: number,
  code?: string,
  details?: Record<string, unknown> | string | null,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      code: code ?? "import_failed",
      details: details ?? null,
    },
    { status },
  );
}

function jsonDbError(scope: string, error: unknown, message: string) {
  const mapped = mapError(error);
  return jsonError(message, 500, mapped.code, {
    scope,
    ...(mapped.meta ?? {}),
  });
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function toStringValue(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return null;
}

function parseUuid(value: unknown) {
  const text = toStringValue(value);
  if (!text) return null;
  return UUID_REGEX.test(text) ? text : null;
}

function parseIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = toStringValue(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function parseInteger(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const text = toStringValue(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = toStringValue(value);
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (lowered === "true" || lowered === "1") return true;
  if (lowered === "false" || lowered === "0") return false;
  return null;
}

function emptyToNull<T = unknown>(value: T) {
  if (typeof value !== "string") return value;
  return value.trim() === "" ? null : value.trim();
}

function isNewer(incoming: string, existing: string | null) {
  if (!existing) return true;
  const incomingMs = Date.parse(incoming);
  const existingMs = Date.parse(existing);
  if (Number.isNaN(incomingMs) || Number.isNaN(existingMs)) return true;
  return incomingMs > existingMs;
}

function warn(warnings: string[], message: string) {
  warnings.push(message);
}

export async function POST(request: Request) {
  const warnings: string[] = [];
  const imported: ImportCounts = {
    projects: 0,
    tasks: 0,
    sessions: 0,
    events: 0,
    queue: 0,
    settings: 0,
  };
  const skipped: ImportCounts = {
    projects: 0,
    tasks: 0,
    sessions: 0,
    events: 0,
    queue: 0,
    settings: 0,
  };

  try {
    const formData = await request.formData();
    const mode = formData.get("mode");
    const file = formData.get("file");

    if (mode !== "merge") {
      return jsonError("Unsupported mode", 400, "unsupported_mode", {
        allowed: ["merge"],
      });
    }

    if (!(file instanceof File)) {
      return jsonError("Missing file", 400, "invalid_file", {
        expectedField: "file",
      });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let raw: Awaited<ReturnType<typeof parseXlsxExport>> | null = null;
    try {
      raw = fileName.endsWith(".xlsx")
        ? await parseXlsxExport(buffer)
        : fileName.endsWith(".zip")
          ? await parseZipExport(buffer)
          : null;
    } catch (error) {
      if (error instanceof ImportParseError) {
        return jsonError(error.message, 400, error.code, error.details ?? null);
      }
      throw error;
    }

    if (!raw) {
      return jsonError(
        "Unsupported file format",
        400,
        "invalid_file",
        "Supported formats are .xlsx and .zip",
      );
    }

    const manifest = (raw.manifest ?? {}) as Manifest;
    const schemaVersion = String(manifest.schema_version ?? "").trim();
    const appName = String(manifest.app ?? "").trim().toLowerCase();

    if (schemaVersion !== "1" || appName !== "doittimer") {
      return jsonError("Invalid manifest", 400, "invalid_manifest", {
        expected: { schema_version: "1", app: "doittimer" },
        actual: { schema_version: schemaVersion || null, app: appName || null },
      });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonError("Unauthorized", 401, "unauthorized", {
        reason: userError?.message ?? "No authenticated user",
      });
    }

    const userId = userData.user.id;

    const normalizedProjects: Record<string, unknown>[] = [];
    raw.projects.forEach((row, index) => {
      const id = parseUuid(row.id);
      const name = toStringValue(row.name);
      const createdAt = parseIso(row.created_at);
      const updatedAt = parseIso(row.updated_at);
      const archivedAt = parseIso(row.archived_at);

      if (!id || !name || !createdAt || !updatedAt) {
        skipped.projects += 1;
        warn(warnings, `Projects row ${index + 1} skipped (invalid required fields).`);
        return;
      }

      normalizedProjects.push({
        id,
        name,
        archived_at: archivedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      });
    });

    const normalizedTasks: Record<string, unknown>[] = [];
    raw.tasks.forEach((row, index) => {
      const id = parseUuid(row.id);
      const title = toStringValue(row.title);
      const completedValue = parseBoolean(row.completed);
      const completed = completedValue ?? false;
      const rawProjectId = emptyToNull(row.project_id);
      const projectId = parseUuid(rawProjectId);
      const createdAt = parseIso(row.created_at);
      const updatedAt = parseIso(row.updated_at);
      const archivedAt = parseIso(row.archived_at);
      const pomodoroWork = parseInteger(row.pomodoro_work_minutes);
      const pomodoroShort = parseInteger(row.pomodoro_short_break_minutes);
      const pomodoroLong = parseInteger(row.pomodoro_long_break_minutes);
      const pomodoroEvery = parseInteger(row.pomodoro_long_break_every);

      if (!id || !title || !createdAt || !updatedAt) {
        skipped.tasks += 1;
        warn(warnings, `Tasks row ${index + 1} skipped (invalid required fields).`);
        return;
      }

      if (row.completed != null && completedValue == null) {
        warn(warnings, `Tasks row ${index + 1} completed invalid; set to false.`);
      }

      if (rawProjectId && !projectId) {
        warn(warnings, `Tasks row ${index + 1} project_id invalid; set to null.`);
      }

      normalizedTasks.push({
        id,
        title,
        completed,
        project_id: projectId,
        archived_at: archivedAt,
        created_at: createdAt,
        updated_at: updatedAt,
        pomodoro_work_minutes: pomodoroWork,
        pomodoro_short_break_minutes: pomodoroShort,
        pomodoro_long_break_minutes: pomodoroLong,
        pomodoro_long_break_every: pomodoroEvery,
      });
    });

    const normalizedSessions: Record<string, unknown>[] = [];
    raw.sessions.forEach((row, index) => {
      const id = parseUuid(row.id);
      const rawTaskId = emptyToNull(row.task_id);
      const taskId = parseUuid(rawTaskId);
      const startedAt = parseIso(row.started_at);
      let endedAt = parseIso(row.ended_at);
      const durationSeconds = parseInteger(row.duration_seconds);
      const pomodoroPhase = emptyToNull(toStringValue(row.pomodoro_phase));
      const pomodoroPhaseStartedAtRaw = emptyToNull(row.pomodoro_phase_started_at);
      const pomodoroPhaseStartedAt = pomodoroPhaseStartedAtRaw
        ? parseIso(pomodoroPhaseStartedAtRaw)
        : null;
      const pomodoroIsPaused = parseBoolean(row.pomodoro_is_paused);
      const pomodoroPausedAtRaw = emptyToNull(row.pomodoro_paused_at);
      const pomodoroPausedAt = pomodoroPausedAtRaw
        ? parseIso(pomodoroPausedAtRaw)
        : null;
      const pomodoroCycleCountRaw = emptyToNull(row.pomodoro_cycle_count);
      const pomodoroCycleCount = pomodoroCycleCountRaw == null
        ? null
        : parseInteger(pomodoroCycleCountRaw);
      const musicUrl = emptyToNull(toStringValue(row.music_url));

      if (!id || !startedAt) {
        skipped.sessions += 1;
        warn(warnings, `Sessions row ${index + 1} skipped (invalid required fields).`);
        return;
      }

      if (rawTaskId && !taskId) {
        warn(warnings, `Sessions row ${index + 1} task_id invalid; set to null.`);
      }

      if (!endedAt && durationSeconds != null) {
        const startedMs = Date.parse(startedAt);
        if (!Number.isNaN(startedMs)) {
          endedAt = new Date(startedMs + durationSeconds * 1000).toISOString();
          warn(warnings, `Sessions row ${index + 1} ended_at synthesized.`);
        }
      }

      if (!endedAt) {
        skipped.sessions += 1;
        warn(warnings, `Sessions row ${index + 1} skipped (missing ended_at).`);
        return;
      }

      const safeDurationSeconds = Math.max(0, durationSeconds ?? 0);

      normalizedSessions.push({
        id,
        task_id: taskId,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: safeDurationSeconds,
        music_url: musicUrl,
        pomodoro_phase: pomodoroPhase,
        pomodoro_phase_started_at: pomodoroPhaseStartedAt,
        pomodoro_is_paused: pomodoroIsPaused ?? false,
        pomodoro_paused_at: pomodoroPausedAt,
        pomodoro_cycle_count: Math.max(0, pomodoroCycleCount ?? 0),
      });
    });

    const normalizedEvents: Record<string, unknown>[] = [];
    raw.pomodoroEvents.forEach((row, index) => {
      const id = parseUuid(row.id);
      const sessionId = parseUuid(row.session_id);
      const taskId = parseUuid(row.task_id);
      const eventType = toStringValue(row.event_type);
      const occurredAt = parseIso(row.occurred_at);
      const cycleCount = parseInteger(row.pomodoro_cycle_count);

      if (!id || !sessionId || !taskId || !eventType || !occurredAt) {
        skipped.events += 1;
        warn(warnings, `PomodoroEvents row ${index + 1} skipped (invalid required fields).`);
        return;
      }

      normalizedEvents.push({
        id,
        session_id: sessionId,
        task_id: taskId,
        event_type: eventType,
        pomodoro_cycle_count: cycleCount,
        occurred_at: occurredAt,
      });
    });

    const normalizedQueue: Record<string, unknown>[] = [];
    raw.queue.forEach((row, index) => {
      const taskId = parseUuid(row.task_id);
      const sortOrder = parseInteger(row.sort_order);
      const createdAt = parseIso(row.created_at);

      if (!taskId || sortOrder == null || !createdAt) {
        skipped.queue += 1;
        warn(warnings, `Queue row ${index + 1} skipped (invalid required fields).`);
        return;
      }

      normalizedQueue.push({
        task_id: taskId,
        sort_order: sortOrder,
        created_at: createdAt,
      });
    });

    const normalizedSettings = raw.settings.length > 0 ? raw.settings[0] : null;
    const settingsDefaultTaskIdRaw = normalizedSettings
      ? emptyToNull(normalizedSettings.default_task_id)
      : null;
    const settingsPayload = normalizedSettings
      ? {
        timezone: toStringValue(normalizedSettings.timezone),
        default_task_id: parseUuid(settingsDefaultTaskIdRaw),
        created_at: parseIso(normalizedSettings.created_at),
        updated_at: parseIso(normalizedSettings.updated_at),
        pomodoro_work_minutes: parseInteger(normalizedSettings.pomodoro_work_minutes),
        pomodoro_short_break_minutes: parseInteger(
          normalizedSettings.pomodoro_short_break_minutes,
        ),
        pomodoro_long_break_minutes: parseInteger(
          normalizedSettings.pomodoro_long_break_minutes,
        ),
        pomodoro_long_break_every: parseInteger(
          normalizedSettings.pomodoro_long_break_every,
        ),
        pomodoro_v2_enabled: parseBoolean(normalizedSettings.pomodoro_v2_enabled),
      }
      : null;

    if (settingsDefaultTaskIdRaw && !settingsPayload?.default_task_id) {
      warn(warnings, "Settings default_task_id invalid; set to null.");
    }

    if (
      settingsPayload
      && (!settingsPayload.created_at || !settingsPayload.updated_at)
    ) {
      skipped.settings += 1;
      warn(warnings, "Settings row skipped (invalid timestamps).");
    }

    const projectIds = normalizedProjects.map((row) => row.id as string);
    const taskIds = normalizedTasks.map((row) => row.id as string);
    const sessionIds = normalizedSessions.map((row) => row.id as string);
    const eventIds = normalizedEvents.map((row) => row.id as string);

    const existingProjects = new Map<string, string | null>();
    for (const ids of chunk(projectIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("projects")
        .select("id,updated_at")
        .in("id", ids);
      if (error) {
        logServerError({
          scope: "import.projects.select",
          userId,
          error,
        });
        return jsonDbError("import.projects.select", error, "Failed to import projects");
      }
      (data ?? []).forEach((row) => {
        existingProjects.set(row.id, row.updated_at ?? null);
      });
    }

    const existingTasks = new Map<string, string | null>();
    for (const ids of chunk(taskIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,updated_at")
        .in("id", ids);
      if (error) {
        logServerError({
          scope: "import.tasks.select",
          userId,
          error,
        });
        return jsonDbError("import.tasks.select", error, "Failed to import tasks");
      }
      (data ?? []).forEach((row) => {
        existingTasks.set(row.id, row.updated_at ?? null);
      });
    }

    const existingSessions = new Set<string>();
    for (const ids of chunk(sessionIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("sessions")
        .select("id")
        .in("id", ids);
      if (error) {
        logServerError({
          scope: "import.sessions.select",
          userId,
          error,
        });
        return jsonDbError("import.sessions.select", error, "Failed to import sessions");
      }
      (data ?? []).forEach((row) => {
        existingSessions.add(row.id);
      });
    }

    const existingEvents = new Set<string>();
    for (const ids of chunk(eventIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("session_pomodoro_events")
        .select("id")
        .in("id", ids);
      if (error) {
        logServerError({
          scope: "import.events.select",
          userId,
          error,
        });
        return jsonDbError("import.events.select", error, "Failed to import events");
      }
      (data ?? []).forEach((row) => {
        existingEvents.add(row.id);
      });
    }

    const projectInserts: Record<string, unknown>[] = [];
    const projectUpdates: Record<string, unknown>[] = [];
    normalizedProjects.forEach((row) => {
      const updatedAt = row.updated_at as string;
      const existingUpdatedAt = existingProjects.get(row.id as string) ?? null;
      if (!existingUpdatedAt) {
        projectInserts.push({ ...row, user_id: userId });
      } else if (isNewer(updatedAt, existingUpdatedAt)) {
        projectUpdates.push({ ...row, user_id: userId });
      }
    });

    for (const rows of chunk(projectInserts, CHUNK_SIZE)) {
      const { error } = await supabase.from("projects").insert(rows);
      if (error) {
        logServerError({
          scope: "import.projects.insert",
          userId,
          error,
        });
        return jsonDbError("import.projects.insert", error, "Failed to import projects");
      }
      imported.projects += rows.length;
    }

    for (const rows of chunk(projectUpdates, CHUNK_SIZE)) {
      const { error } = await supabase
        .from("projects")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        logServerError({
          scope: "import.projects.update",
          userId,
          error,
        });
        return jsonDbError("import.projects.update", error, "Failed to import projects");
      }
      imported.projects += rows.length;
    }

    const taskInserts: Record<string, unknown>[] = [];
    const taskUpdates: Record<string, unknown>[] = [];
    normalizedTasks.forEach((row) => {
      const updatedAt = row.updated_at as string;
      const existingUpdatedAt = existingTasks.get(row.id as string) ?? null;
      if (!existingUpdatedAt) {
        taskInserts.push({ ...row, user_id: userId });
      } else if (isNewer(updatedAt, existingUpdatedAt)) {
        taskUpdates.push({ ...row, user_id: userId });
      }
    });

    for (const rows of chunk(taskInserts, CHUNK_SIZE)) {
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) {
        logServerError({
          scope: "import.tasks.insert",
          userId,
          error,
        });
        return jsonDbError("import.tasks.insert", error, "Failed to import tasks");
      }
      imported.tasks += rows.length;
    }

    for (const rows of chunk(taskUpdates, CHUNK_SIZE)) {
      const { error } = await supabase.from("tasks").upsert(rows, { onConflict: "id" });
      if (error) {
        logServerError({
          scope: "import.tasks.update",
          userId,
          error,
        });
        return jsonDbError("import.tasks.update", error, "Failed to import tasks");
      }
      imported.tasks += rows.length;
    }

    const sessionInserts = normalizedSessions.filter(
      (row) => !existingSessions.has(row.id as string),
    );
    for (const rows of chunk(sessionInserts, CHUNK_SIZE)) {
      const { error } = await supabase.from("sessions").insert(
        rows.map((row) => ({ ...row, user_id: userId })),
      );
      if (error) {
        logServerError({
          scope: "import.sessions.insert",
          userId,
          error,
        });
        return jsonDbError("import.sessions.insert", error, "Failed to import sessions");
      }
      imported.sessions += rows.length;
    }

    const eventInserts = normalizedEvents.filter(
      (row) => !existingEvents.has(row.id as string),
    );
    for (const rows of chunk(eventInserts, CHUNK_SIZE)) {
      const { error } = await supabase.from("session_pomodoro_events").insert(
        rows.map((row) => ({ ...row, user_id: userId })),
      );
      if (error) {
        logServerError({
          scope: "import.events.insert",
          userId,
          error,
        });
        return jsonDbError("import.events.insert", error, "Failed to import events");
      }
      imported.events += rows.length;
    }

    const queueTaskIds = normalizedQueue.map((row) => row.task_id as string);
    const existingQueueTasks = new Set<string>();
    for (const ids of chunk(queueTaskIds, CHUNK_SIZE)) {
      const { data, error } = await supabase.from("tasks").select("id").in("id", ids);
      if (error) {
        logServerError({
          scope: "import.queue.select",
          userId,
          error,
        });
        return jsonDbError("import.queue.select", error, "Failed to import queue");
      }
      (data ?? []).forEach((row) => {
        existingQueueTasks.add(row.id);
      });
    }

    const filteredQueue = normalizedQueue.filter((row) =>
      existingQueueTasks.has(row.task_id as string),
    );
    const missingQueueTasks = normalizedQueue.length - filteredQueue.length;
    if (missingQueueTasks > 0) {
      warn(warnings, "Queue items with missing tasks were skipped.");
      skipped.queue += missingQueueTasks;
    }

    const sortedQueue = filteredQueue.sort((a, b) => {
      const orderA = a.sort_order as number;
      const orderB = b.sort_order as number;
      if (orderA !== orderB) return orderA - orderB;
      return Date.parse(a.created_at as string) - Date.parse(b.created_at as string);
    });

    let queueToInsert = sortedQueue;
    if (sortedQueue.length > 7) {
      warn(warnings, "Queue truncated to 7 items.");
      queueToInsert = sortedQueue.slice(0, 7);
    }

    const truncatedQueueCount = filteredQueue.length - queueToInsert.length;
    if (truncatedQueueCount > 0) {
      skipped.queue += truncatedQueueCount;
    }

    const { error: queueDeleteError } = await supabase
      .from("task_queue_items")
      .delete()
      .eq("user_id", userId);
    if (queueDeleteError) {
      logServerError({
        scope: "import.queue.delete",
        userId,
        error: queueDeleteError,
      });
      return jsonDbError("import.queue.delete", queueDeleteError, "Failed to import queue");
    }

    const repackedQueue = queueToInsert.map((row, index) => ({
      ...row,
      sort_order: index,
      user_id: userId,
    }));

    for (const rows of chunk(repackedQueue, CHUNK_SIZE)) {
      const { error } = await supabase.from("task_queue_items").insert(rows);
      if (error) {
        logServerError({
          scope: "import.queue.insert",
          userId,
          error,
        });
        return jsonDbError("import.queue.insert", error, "Failed to import queue");
      }
      imported.queue += rows.length;
    }

    if (
      settingsPayload
      && settingsPayload.created_at
      && settingsPayload.updated_at
    ) {
      const { data: existingSettings, error: settingsSelectError } = await supabase
        .from("user_settings")
        .select("updated_at")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (settingsSelectError) {
        logServerError({
          scope: "import.settings.select",
          userId,
          error: settingsSelectError,
        });
        return jsonDbError("import.settings.select", settingsSelectError, "Failed to import settings");
      }

      const incomingUpdatedAt = Date.parse(settingsPayload.updated_at);
      const existingUpdatedAt = existingSettings?.updated_at
        ? Date.parse(existingSettings.updated_at)
        : Number.NEGATIVE_INFINITY;

      if (Number.isNaN(incomingUpdatedAt)) {
        skipped.settings += 1;
        warn(warnings, "Settings row skipped (invalid updated_at).");
      } else if (incomingUpdatedAt <= existingUpdatedAt) {
        skipped.settings += 1;
      } else {
        let defaultTaskId = settingsPayload.default_task_id;
        if (defaultTaskId) {
          const { data } = await supabase
            .from("tasks")
            .select("id")
            .eq("id", defaultTaskId)
            .maybeSingle();
          if (!data?.id) {
            warn(warnings, "Settings default_task_id not found; set to null.");
            defaultTaskId = null;
          }
        }

        const { error } = await supabase.from("user_settings").upsert({
          user_id: userId,
          timezone: settingsPayload.timezone,
          default_task_id: defaultTaskId,
          created_at: settingsPayload.created_at,
          updated_at: settingsPayload.updated_at,
          pomodoro_work_minutes: settingsPayload.pomodoro_work_minutes,
          pomodoro_short_break_minutes: settingsPayload.pomodoro_short_break_minutes,
          pomodoro_long_break_minutes: settingsPayload.pomodoro_long_break_minutes,
          pomodoro_long_break_every: settingsPayload.pomodoro_long_break_every,
          pomodoro_v2_enabled: settingsPayload.pomodoro_v2_enabled,
        });

        if (error) {
          logServerError({
            scope: "import.settings.upsert",
            userId,
            error,
          });
          return jsonDbError("import.settings.upsert", error, "Failed to import settings");
        }
        imported.settings += 1;
      }
    }

    revalidatePath("/tasks");
    revalidatePath("/focus");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      warnings,
    });
  } catch (error) {
    logServerError({
      scope: "import.route",
      error,
    });
    const mapped = mapError(error);
    return jsonError("Import failed", 500, mapped.code, mapped.meta ?? null);
  }
}
