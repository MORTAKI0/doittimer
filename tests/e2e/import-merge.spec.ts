import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { randomUUID } from "crypto";

import { EXPORT_HEADERS } from "../../lib/export/xlsx";

const ISO_NOW = "2026-02-04T12:00:00.000Z";
const ISO_FUTURE = "2099-01-01T00:00:00.000Z";
const PROJECT_ID = randomUUID();
const TASK_IDS = Array.from({ length: 8 }, () => randomUUID());
const SESSION_ID = randomUUID();
const EVENT_ID = randomUUID();

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: keyof typeof EXPORT_HEADERS,
  rows: Record<string, unknown>[],
) {
  const headers = EXPORT_HEADERS[name];
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  rows.forEach((row) => {
    sheet.addRow(headers.map((header) => row[header] ?? null));
  });
}

async function buildWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();

  const manifest = workbook.addWorksheet("Manifest");
  manifest.addRow(EXPORT_HEADERS.Manifest);
  manifest.addRow(["schema_version", "1"]);
  manifest.addRow(["exported_at", ISO_NOW]);
  manifest.addRow(["app", "doittimer"]);

  const projects = [
    {
      id: PROJECT_ID,
      name: "Import Project",
      archived_at: null,
      created_at: ISO_NOW,
      updated_at: ISO_NOW,
    },
  ];

  const tasks = TASK_IDS.map((id, index) => ({
    id,
    title: `Import Task ${index + 1}`,
    completed: false,
    project_id: PROJECT_ID,
    archived_at: null,
    created_at: ISO_NOW,
    updated_at: ISO_NOW,
    pomodoro_work_minutes: 25,
    pomodoro_short_break_minutes: 5,
    pomodoro_long_break_minutes: 15,
    pomodoro_long_break_every: 4,
  }));

  const sessions = [
    {
      id: SESSION_ID,
      task_id: TASK_IDS[0],
      started_at: "2026-02-04T09:00:00.000Z",
      ended_at: null,
      duration_seconds: 1200,
      music_url: null,
      pomodoro_phase: null,
      pomodoro_phase_started_at: null,
      pomodoro_is_paused: null,
      pomodoro_paused_at: null,
      pomodoro_cycle_count: 1,
    },
  ];

  const events = [
    {
      id: EVENT_ID,
      session_id: SESSION_ID,
      task_id: TASK_IDS[0],
      event_type: "work_completed",
      pomodoro_cycle_count: 1,
      occurred_at: "2026-02-04T09:20:00.000Z",
    },
  ];

  const queue = TASK_IDS.map((taskId, index) => ({
    task_id: taskId,
    sort_order: index,
    created_at: ISO_NOW,
  }));

  const settings = [
    {
      timezone: "UTC",
      default_task_id: TASK_IDS[0],
      created_at: ISO_NOW,
      updated_at: ISO_FUTURE,
      pomodoro_work_minutes: 25,
      pomodoro_short_break_minutes: 5,
      pomodoro_long_break_minutes: 15,
      pomodoro_long_break_every: 4,
      pomodoro_v2_enabled: true,
    },
  ];

  addTableSheet(workbook, "Projects", projects);
  addTableSheet(workbook, "Tasks", tasks);
  addTableSheet(workbook, "Sessions", sessions);
  addTableSheet(workbook, "PomodoroEvents", events);
  addTableSheet(workbook, "Queue", queue);
  addTableSheet(workbook, "Settings", settings);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test("import merge xlsx is idempotent and safe", async ({ page }) => {
  const buffer = await buildWorkbookBuffer();

  const first = await page.request.post("/api/data/import", {
    multipart: {
      file: {
        name: "doittimer-export.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer,
      },
      mode: "merge",
    },
  });

  expect(first.status()).toBe(200);
  const payload = (await first.json()) as Record<string, any>;
  expect(payload.success).toBe(true);
  expect(payload.imported.projects).toBe(1);
  expect(payload.imported.tasks).toBe(TASK_IDS.length);
  expect(payload.imported.sessions).toBe(1);
  expect(payload.imported.events).toBe(1);
  expect(payload.imported.queue).toBe(7);
  expect(payload.imported.settings).toBe(1);
  expect(payload.warnings).toContain("Sessions row 1 ended_at synthesized.");
  expect(payload.warnings).toContain("Queue truncated to 7 items.");

  const second = await page.request.post("/api/data/import", {
    multipart: {
      file: {
        name: "doittimer-export.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer,
      },
      mode: "merge",
    },
  });

  expect(second.status()).toBe(200);
  const payload2 = (await second.json()) as Record<string, any>;
  expect(payload2.success).toBe(true);
  expect(payload2.imported.projects).toBe(0);
  expect(payload2.imported.tasks).toBe(0);
  expect(payload2.imported.sessions).toBe(0);
  expect(payload2.imported.events).toBe(0);
  expect(payload2.imported.queue).toBe(7);
  expect(payload2.imported.settings).toBe(1);

  await page.goto("/focus");
  await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
});
