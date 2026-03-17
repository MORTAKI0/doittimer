export const DEV_DIAGNOSTICS_ENABLED = process.env.NODE_ENV !== "production";
const SERVER_PREFIX = "[dev-diag:server]";
const SERVER_LOG_PATH = ".tmp/dev-diagnostics.log";

export type DiagnosticPayload = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

export function logServerDiagnostic(event: string, payload: DiagnosticPayload = {}) {
  if (!DEV_DIAGNOSTICS_ENABLED) {
    return;
  }

  const entry = {
    event,
    ts: nowIso(),
    ...payload,
  };

  console.info(SERVER_PREFIX, entry);

  if (typeof window !== "undefined") {
    return;
  }

  try {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const filePath = path.join(process.cwd(), SERVER_LOG_PATH);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Avoid failing requests because diagnostics could not be written.
  }
}
