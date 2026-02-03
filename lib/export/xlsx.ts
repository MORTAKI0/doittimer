import ExcelJS from "exceljs";

export const EXPORT_SHEETS = [
  "Manifest",
  "Projects",
  "Tasks",
  "Sessions",
  "PomodoroEvents",
  "Queue",
  "Settings",
] as const;

export const EXPORT_HEADERS = {
  Manifest: ["key", "value"],
  Projects: ["id", "name", "archived_at", "created_at", "updated_at"],
  Tasks: [
    "id",
    "title",
    "completed",
    "project_id",
    "archived_at",
    "created_at",
    "updated_at",
    "pomodoro_work_minutes",
    "pomodoro_short_break_minutes",
    "pomodoro_long_break_minutes",
    "pomodoro_long_break_every",
  ],
  Sessions: [
    "id",
    "task_id",
    "started_at",
    "ended_at",
    "duration_seconds",
    "music_url",
    "pomodoro_phase",
    "pomodoro_phase_started_at",
    "pomodoro_is_paused",
    "pomodoro_paused_at",
    "pomodoro_cycle_count",
  ],
  PomodoroEvents: [
    "id",
    "session_id",
    "task_id",
    "event_type",
    "pomodoro_cycle_count",
    "occurred_at",
  ],
  Queue: ["task_id", "sort_order", "created_at"],
  Settings: [
    "timezone",
    "default_task_id",
    "created_at",
    "updated_at",
    "pomodoro_work_minutes",
    "pomodoro_short_break_minutes",
    "pomodoro_long_break_minutes",
    "pomodoro_long_break_every",
    "pomodoro_v2_enabled",
  ],
} as const;

export type ExportData = {
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  pomodoroEvents: Record<string, unknown>[];
  queue: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
};

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: Exclude<(typeof EXPORT_SHEETS)[number], "Manifest">,
  rows: Record<string, unknown>[],
) {
  const headers = EXPORT_HEADERS[name];
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  rows.forEach((row) => {
    sheet.addRow(headers.map((header) => row[header] ?? null));
  });
}

export function buildExportWorkbook(data: ExportData, exportedAtIso?: string) {
  const workbook = new ExcelJS.Workbook();
  const exportedAt = exportedAtIso ?? new Date().toISOString();

  const manifest = workbook.addWorksheet("Manifest");
  manifest.addRow(EXPORT_HEADERS.Manifest);
  manifest.addRow(["schema_version", "1"]);
  manifest.addRow(["exported_at", exportedAt]);
  manifest.addRow(["app", "doittimer"]);
  manifest.addRow(["notes", ""]);

  addTableSheet(workbook, "Projects", data.projects);
  addTableSheet(workbook, "Tasks", data.tasks);
  addTableSheet(workbook, "Sessions", data.sessions);
  addTableSheet(workbook, "PomodoroEvents", data.pomodoroEvents);
  addTableSheet(workbook, "Queue", data.queue);
  addTableSheet(workbook, "Settings", data.settings ? [data.settings] : []);

  return { workbook, exportedAt };
}
