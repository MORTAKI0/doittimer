import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";

const SHEET_NAMES = [
  "Manifest",
  "Projects",
  "Tasks",
  "Sessions",
  "PomodoroEvents",
  "Queue",
  "Settings",
];

test("xlsx export endpoint returns workbook with required sheets", async ({ page }) => {
  const response = await page.request.get("/api/data/export?format=xlsx");
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  expect(headers["content-disposition"]).toContain("attachment");
  expect(headers["content-disposition"]).toContain(".xlsx");

  const body = await response.body();
  expect(body.length).toBeGreaterThan(0);

  const workbook = new ExcelJS.Workbook();
  // ExcelJS runtime accepts this; TS types are mismatched due to Buffer typing conflicts.
  await workbook.xlsx.load(body as any);

  const names = workbook.worksheets.map((sheet) => sheet.name);
  expect(names).toEqual(SHEET_NAMES);

  const tasks = workbook.getWorksheet("Tasks");
  expect(tasks).toBeTruthy();
  expect(tasks!.rowCount).toBeGreaterThan(1);

  const manifest = workbook.getWorksheet("Manifest");
  expect(manifest).toBeTruthy();
  const manifestText = manifest!
    .getSheetValues()
    .flat()
    .filter(Boolean)
    .map(String)
    .join(" ");
  expect(manifestText).toContain("tasks_count");
});
