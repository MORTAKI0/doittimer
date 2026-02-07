import ExcelJS from "exceljs";
import JSZip from "jszip";
import Papa from "papaparse";

import { EXPORT_HEADERS } from "@/lib/export/xlsx";

export type RawImportData = {
  manifest: Record<string, unknown> | null;
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  pomodoroEvents: Record<string, unknown>[];
  queue: Record<string, unknown>[];
  settings: Record<string, unknown>[];
};

export class ImportParseError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ImportParseError";
    this.code = code;
    this.details = details;
  }
}

type SheetName = Exclude<keyof typeof EXPORT_HEADERS, "Manifest">;

function normalizeCellValue(value: ExcelJS.CellValue) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }
    if ("result" in value) {
      return value.result ?? null;
    }
  }
  return value;
}

function readSheetRows(
  workbook: ExcelJS.Workbook,
  name: SheetName,
  headers: readonly string[],
) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) return [] as Record<string, unknown>[];
  const rows: Record<string, unknown>[] = [];

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const record: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = normalizeCellValue(cell.value);
      if (value !== null && value !== undefined && value !== "") {
        hasValue = true;
      }
      record[header] = value;
    });

    if (hasValue) rows.push(record);
  }

  return rows;
}

function getSheetHeaderRow(sheet: ExcelJS.Worksheet) {
  const values = sheet.getRow(1).values;
  const rowValues = Array.isArray(values) ? values : [];
  return rowValues
    .slice(1)
    .map((value: ExcelJS.CellValue) => String(normalizeCellValue(value) ?? "").trim());
}

function assertHeaders(
  actual: readonly string[] | undefined,
  expected: readonly string[],
  target: string,
) {
  const safeActual = actual ?? [];
  const matches =
    safeActual.length === expected.length
    && expected.every((header, index) => safeActual[index] === header);

  if (!matches) {
    throw new ImportParseError(
      "invalid_headers",
      `Invalid headers for ${target}.`,
      { target, expected, actual: safeActual },
    );
  }
}

function readManifest(workbook: ExcelJS.Workbook) {
  const sheet = workbook.getWorksheet("Manifest");
  if (!sheet) return null;
  const manifest: Record<string, unknown> = {};

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const key = normalizeCellValue(row.getCell(1).value);
    const value = normalizeCellValue(row.getCell(2).value);
    if (typeof key === "string" && key.trim()) {
      manifest[key.trim()] = value ?? null;
    }
  }

  return manifest;
}

export async function parseXlsxExport(buffer: Buffer): Promise<RawImportData> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as any);
  } catch (error) {
    throw new ImportParseError("invalid_xlsx", "File is not a valid XLSX workbook.", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }

  const requiredSheets = [
    "Manifest",
    "Projects",
    "Tasks",
    "Sessions",
    "PomodoroEvents",
    "Queue",
    "Settings",
  ] as const;

  requiredSheets.forEach((name) => {
    if (!workbook.getWorksheet(name)) {
      throw new ImportParseError(
        "missing_sheet",
        `Missing required sheet: ${name}.`,
        { sheet: name },
      );
    }
  });

  const manifestSheet = workbook.getWorksheet("Manifest");
  if (!manifestSheet) {
    throw new ImportParseError("missing_sheet", "Missing required sheet: Manifest.");
  }
  assertHeaders(getSheetHeaderRow(manifestSheet), EXPORT_HEADERS.Manifest, "Manifest");

  (["Projects", "Tasks", "Sessions", "PomodoroEvents", "Queue", "Settings"] as const)
    .forEach((name) => {
      const sheet = workbook.getWorksheet(name);
      if (!sheet) {
        throw new ImportParseError("missing_sheet", `Missing required sheet: ${name}.`);
      }
      assertHeaders(getSheetHeaderRow(sheet), EXPORT_HEADERS[name], name);
    });

  return {
    manifest: readManifest(workbook),
    projects: readSheetRows(workbook, "Projects", EXPORT_HEADERS.Projects),
    tasks: readSheetRows(workbook, "Tasks", EXPORT_HEADERS.Tasks),
    sessions: readSheetRows(workbook, "Sessions", EXPORT_HEADERS.Sessions),
    pomodoroEvents: readSheetRows(
      workbook,
      "PomodoroEvents",
      EXPORT_HEADERS.PomodoroEvents,
    ),
    queue: readSheetRows(workbook, "Queue", EXPORT_HEADERS.Queue),
    settings: readSheetRows(workbook, "Settings", EXPORT_HEADERS.Settings),
  };
}

function normalizeFileKey(fileName: string) {
  return fileName.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/g, "");
}

function addCsvRows(
  target: Record<string, unknown>[],
  csvText: string,
  targetName: string,
  headers?: readonly string[],
) {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    throw new ImportParseError("invalid_csv", `Invalid CSV in ${targetName}.`, {
      target: targetName,
      errors: parsed.errors.slice(0, 5),
    });
  }

  if (headers) {
    assertHeaders(parsed.meta.fields, headers, targetName);
  }

  parsed.data.forEach((row: Record<string, unknown>) => {
    if (!row || typeof row !== "object") return;
    if (headers) {
      const normalized: Record<string, unknown> = {};
      headers.forEach((header) => {
        normalized[header] = row[header] ?? null;
      });
      target.push(normalized);
    } else {
      target.push(row);
    }
  });
}

function parseManifestCsv(csvText: string) {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    throw new ImportParseError("invalid_manifest", "Manifest.csv parsing failed.", {
      errors: parsed.errors.slice(0, 5),
    });
  }
  assertHeaders(parsed.meta.fields, EXPORT_HEADERS.Manifest, "Manifest.csv");
  const manifest: Record<string, unknown> = {};

  parsed.data.forEach((row: Record<string, unknown>) => {
    if (!row || typeof row !== "object") return;
    const key = row.key ?? row.Key ?? row.KEY;
    const value = row.value ?? row.Value ?? row.VALUE;
    if (typeof key === "string" && key.trim()) {
      manifest[key.trim()] = value ?? null;
    }
  });

  return Object.keys(manifest).length > 0 ? manifest : null;
}

export async function parseZipExport(buffer: Buffer): Promise<RawImportData> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    throw new ImportParseError("invalid_zip", "File is not a valid ZIP archive.", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }

  const data: RawImportData = {
    manifest: null,
    projects: [],
    tasks: [],
    sessions: [],
    pomodoroEvents: [],
    queue: [],
    settings: [],
  };

  const entries = Object.values(zip.files) as JSZip.JSZipObject[];
  const seen = {
    projects: false,
    tasks: false,
    sessions: false,
    pomodoroEvents: false,
    queue: false,
    settings: false,
    manifest: false,
  };

  for (const entry of entries) {
    if (entry.dir) continue;
    const baseName = entry.name.split("/").pop() ?? entry.name;
    const normalized = normalizeFileKey(baseName);

    if (baseName.toLowerCase().endsWith(".json") && normalized.includes("manifest")) {
      const text = await entry.async("text");
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        data.manifest = parsed;
        seen.manifest = true;
      } catch {
        throw new ImportParseError("invalid_manifest", "manifest.json is not valid JSON.");
      }
      continue;
    }

    if (!baseName.toLowerCase().endsWith(".csv")) continue;

    const text = await entry.async("text");

    if (normalized.includes("manifest")) {
      data.manifest = parseManifestCsv(text);
      seen.manifest = Boolean(data.manifest);
      continue;
    }

    if (normalized === "projects") {
      addCsvRows(data.projects, text, "Projects.csv", EXPORT_HEADERS.Projects);
      seen.projects = true;
      continue;
    }
    if (normalized === "tasks") {
      addCsvRows(data.tasks, text, "Tasks.csv", EXPORT_HEADERS.Tasks);
      seen.tasks = true;
      continue;
    }
    if (normalized === "sessions") {
      addCsvRows(data.sessions, text, "Sessions.csv", EXPORT_HEADERS.Sessions);
      seen.sessions = true;
      continue;
    }
    if (normalized === "queue") {
      addCsvRows(data.queue, text, "Queue.csv", EXPORT_HEADERS.Queue);
      seen.queue = true;
      continue;
    }
    if (normalized === "settings") {
      addCsvRows(data.settings, text, "Settings.csv", EXPORT_HEADERS.Settings);
      seen.settings = true;
      continue;
    }
    if (normalized === "pomodoroevents" || normalized === "sessionpomodoroevents") {
      addCsvRows(
        data.pomodoroEvents,
        text,
        "PomodoroEvents.csv",
        EXPORT_HEADERS.PomodoroEvents,
      );
      seen.pomodoroEvents = true;
      continue;
    }
  }

  if (!seen.manifest || !data.manifest) {
    throw new ImportParseError(
      "missing_manifest",
      "ZIP must contain manifest.json or Manifest.csv.",
    );
  }

  const missingTables: string[] = [];
  if (!seen.projects) missingTables.push("Projects.csv");
  if (!seen.tasks) missingTables.push("Tasks.csv");
  if (!seen.sessions) missingTables.push("Sessions.csv");
  if (!seen.pomodoroEvents) missingTables.push("PomodoroEvents.csv");
  if (!seen.queue) missingTables.push("Queue.csv");
  if (!seen.settings) missingTables.push("Settings.csv");

  if (missingTables.length > 0) {
    throw new ImportParseError("missing_csv_files", "ZIP is missing required CSV files.", {
      missing: missingTables,
    });
  }

  return data;
}
