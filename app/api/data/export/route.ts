import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildExportWorkbook, EXPORT_HEADERS, type ExportData } from "@/lib/export/xlsx";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function rows(res: { data: unknown; error: unknown }) {
  if (res.error) return [];
  return Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
}

function maybeRow(res: { data: unknown; error: unknown }) {
  if (res.error) return null;
  return res.data && typeof res.data === "object"
    ? (res.data as Record<string, unknown>)
    : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format !== "xlsx") {
      return jsonError("Invalid format", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonError("Unauthorized", 401);
    }

    const [
      projectsResult,
      tasksResult,
      sessionsResult,
      eventsResult,
      queueResult,
      settingsResult,
    ] = await Promise.all([
      supabase
        .from("projects")
        .select(EXPORT_HEADERS.Projects.join(","))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("tasks")
        .select(EXPORT_HEADERS.Tasks.join(","))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("sessions")
        .select(
          "id,task_id,started_at,ended_at,duration_seconds,music_url,pomodoro_phase,pomodoro_phase_started_at,pomodoro_is_paused,pomodoro_paused_at,pomodoro_cycle_count",
        )
        .order("started_at", { ascending: true }),
      supabase
        .from("session_pomodoro_events")
        .select(EXPORT_HEADERS.PomodoroEvents.join(","))
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("task_queue_items")
        .select(EXPORT_HEADERS.Queue.join(","))
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("user_settings")
        .select(EXPORT_HEADERS.Settings.join(","))
        .limit(1)
        .maybeSingle(),
    ]);

    if (projectsResult.error) {
      console.error("[export:xlsx] projects error", projectsResult.error);
    }
    if (tasksResult.error) {
      console.error("[export:xlsx] tasks error", tasksResult.error);
    }
    if (sessionsResult.error) {
      console.error("[export:xlsx] sessions error", sessionsResult.error);
    }
    if (eventsResult.error) {
      console.error("[export:xlsx] events error", eventsResult.error);
    }
    if (queueResult.error) {
      console.error("[export:xlsx] queue error", queueResult.error);
    }
    if (settingsResult.error) {
      console.error("[export:xlsx] settings error", settingsResult.error);
    }

    const queryErrors = [
      projectsResult.error,
      tasksResult.error,
      sessionsResult.error,
      eventsResult.error,
      queueResult.error,
      settingsResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      return jsonError("Export failed", 500);
    }

    const exportData: ExportData = {
      projects: rows(projectsResult),
      tasks: rows(tasksResult),
      sessions: rows(sessionsResult),
      pomodoroEvents: rows(eventsResult),
      queue: rows(queueResult),
      settings: maybeRow(settingsResult),
    };

    const { workbook } = buildExportWorkbook(exportData);

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"doittimer-export-${dateStamp}.xlsx\"`,
      },
    });
  } catch (err) {
    console.error("[export:xlsx] failed", err);
    return new Response(JSON.stringify({ error: "export_failed", message: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
