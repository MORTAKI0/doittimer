"use client";

import * as React from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ImportResult = Record<string, unknown>;

type ImportError = {
  message: string;
  code?: string;
  details?: unknown;
};

const IMPORT_TABLES = [
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "sessions", label: "Sessions" },
  { key: "events", label: "Events" },
  { key: "queue", label: "Queue" },
  { key: "settings", label: "Settings" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
}

export function DataManagementCard() {
  const [file, setFile] = React.useState<File | null>(null);
  const [mode] = React.useState<"merge">("merge");
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<ImportError | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showDetails, setShowDetails] = React.useState(false);

  const canSubmit = Boolean(file) && !isPending;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setResult(null);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setError(null);
    setResult(null);
    setShowDetails(false);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", mode);

        const response = await fetch("/api/data/import", {
          method: "POST",
          body: formData,
        });

        let payload: ImportResult | null = null;
        try {
          payload = (await response.json()) as ImportResult;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message =
            (payload && (payload.message as string)) ??
            (payload && (payload.error as string)) ??
            `Import failed (${response.status}).`;
          const code =
            (payload && (payload.code as string)) ??
            (payload && (payload.error_code as string));
          const details = payload && "details" in payload ? payload.details : undefined;
          setError({ message, code: code ?? undefined, details });
          return;
        }

        if (payload && payload.success === false) {
          const message =
            (payload.message as string | undefined) ?? "Import failed.";
          const code =
            (payload.code as string | undefined) ??
            (payload.error_code as string | undefined);
          const details = "details" in payload ? payload.details : undefined;
          setError({ message, code: code ?? undefined, details });
          return;
        }

        setResult(payload ?? { success: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error. Please try again.";
        setError({ message });
      }
    });
  }

  const imported = isRecord(result?.imported)
    ? result?.imported
    : isRecord(result?.counts)
      ? result?.counts
      : {};
  const warningsRaw = result?.warnings;
  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw.map((item) => String(item))
    : warningsRaw
      ? [String(warningsRaw)]
      : [];

  return (
    <Card className="space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Data tools
      </p>
      <div className="space-y-4">
        <div>
          <h2 className="text-section-title text-foreground">Data Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Backup your data or import it when switching accounts.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">Export</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/data/export?format=xlsx"
              className={buttonStyles({ variant: "secondary" })}
              data-testid="data-export-xlsx"
            >
              Export Excel (.xlsx)
            </a>
            <a
              href="/api/data/export?format=csv"
              className={buttonStyles({ variant: "secondary" })}
              data-testid="data-export-csv"
            >
              Export CSV (.zip)
            </a>
          </div>
        </div>

        <form className="space-y-3 rounded-xl border border-border/70 p-4" onSubmit={handleSubmit}>
          <p className="text-sm font-medium text-foreground">Import</p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="data-import-file">
              Import file
            </label>
            <Input
              id="data-import-file"
              name="data-import-file"
              type="file"
              accept=".xlsx,.zip"
              onChange={handleFileChange}
              data-testid="data-import-file"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="data-import-mode">
              Mode
            </label>
            <Input
              id="data-import-mode"
              name="data-import-mode"
              value="merge (only)"
              readOnly
              disabled
              data-testid="data-import-mode"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Imports apply to the signed-in account only. The file cannot select a user.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canSubmit} data-testid="data-import-submit">
              {isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </form>

        {result ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            data-testid="data-import-result"
            role="status"
          >
            <p className="text-sm font-medium text-foreground">Import complete</p>
            <div className="mt-2 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2">
              {IMPORT_TABLES.map((table) => (
                <p key={table.key}>
                  {table.label}:{" "}
                  <span className="font-semibold text-foreground">
                    {readCount(imported?.[table.key])}
                  </span>
                </p>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Warnings
              </p>
              {warnings.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-emerald-900">
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-emerald-900">No warnings.</p>
              )}
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            data-testid="data-import-error"
            role="status"
          >
            <p className="font-medium text-red-700">{error.message}</p>
            {error.code ? (
              <p className="mt-1 text-xs text-red-600">Code: {error.code}</p>
            ) : null}
            {error.details != null ? (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs font-medium underline underline-offset-2"
                  onClick={() => setShowDetails((prev) => !prev)}
                >
                  {showDetails ? "Hide details" : "Show details"}
                </button>
                {showDetails ? (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-red-200 bg-red-100 p-2 text-xs text-red-700">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
