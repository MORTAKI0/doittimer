import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildExportWorkbook, EXPORT_HEADERS, EXPORT_SHEETS } from "@/lib/export/xlsx";

describe("xlsx export workbook", () => {
  it("creates required sheets with correct headers", async () => {
    const { workbook } = buildExportWorkbook(
      {
        projects: [{ id: "p1", name: "Project", archived_at: null, created_at: "2026-02-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z" }],
        tasks: [
          {
            id: "t1",
            title: "Task",
            completed: false,
            project_id: "p1",
            archived_at: null,
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-01T00:00:00Z",
            pomodoro_work_minutes: 25,
            pomodoro_short_break_minutes: 5,
            pomodoro_long_break_minutes: 15,
            pomodoro_long_break_every: 4,
          },
        ],
        sessions: [
          {
            id: "s1",
            task_id: "t1",
            started_at: "2026-02-01T00:00:00Z",
            ended_at: "2026-02-01T00:10:00Z",
            duration_seconds: 600,
            music_url: null,
            pomodoro_phase: "work",
            pomodoro_phase_started_at: "2026-02-01T00:00:00Z",
            pomodoro_is_paused: false,
            pomodoro_paused_at: null,
            pomodoro_cycle_count: 1,
            created_at: "2026-02-01T00:00:00Z",
          },
        ],
        pomodoroEvents: [
          {
            id: "e1",
            session_id: "s1",
            task_id: "t1",
            event_type: "work_completed",
            pomodoro_cycle_count: 1,
            occurred_at: "2026-02-01T00:25:00Z",
            created_at: "2026-02-01T00:25:00Z",
          },
        ],
        queue: [{ task_id: "t1", sort_order: 1, created_at: "2026-02-01T00:00:00Z" }],
        settings: {
          timezone: "UTC",
          default_task_id: null,
          pomodoro_work_minutes: 25,
          pomodoro_short_break_minutes: 5,
          pomodoro_long_break_minutes: 15,
          pomodoro_long_break_every: 4,
          pomodoro_v2_enabled: false,
          updated_at: "2026-02-01T00:00:00Z",
        },
      },
      "2026-02-01T00:00:00Z",
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);

    const names = loaded.worksheets.map((sheet) => sheet.name);
    assert.deepEqual(names, [...EXPORT_SHEETS]);

    const manifestHeader = loaded.getWorksheet("Manifest")?.getRow(1);
    assert.ok(manifestHeader);
    assert.deepEqual([manifestHeader.getCell(1).value, manifestHeader.getCell(2).value], EXPORT_HEADERS.Manifest);

    for (const sheetName of EXPORT_SHEETS) {
      if (sheetName === "Manifest") continue;
      const sheet = loaded.getWorksheet(sheetName);
      assert.ok(sheet, `Missing sheet ${sheetName}`);
      const headers = EXPORT_HEADERS[sheetName];
      const row = sheet.getRow(1);
      const actual = headers.map((_, index) => row.getCell(index + 1).value);
      assert.deepEqual(actual, headers);
    }
  });
});
