"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startSession, stopSession, SessionRow } from "@/app/actions/sessions";
import type { TaskRow } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFocus } from "@/components/ui/icons";

type FocusPanelProps = {
  activeSession: SessionRow | null;
  todaySessions: SessionRow[];
  tasks: TaskRow[];
};

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Identifiant invalide.": "Invalid identifier.",
  "Une session est deja active. Arrete-la avant d'en demarrer une autre.": "A session is already active. Stop it before starting a new one.",
  "Impossible de verifier la session active.": "Unable to verify the active session.",
  "Impossible de demarrer la session.": "Unable to start the session.",
  "Impossible d'arreter la session.": "Unable to stop the session.",
  "Impossible de charger la session active.": "Unable to load the active session.",
  "Impossible de charger les sessions du jour.": "Unable to load today's sessions.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function formatElapsed(seconds: number) {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function formatStartTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function parseTimestamptz(input: string) {
  let value = input.trim();
  if (value.includes(" ") && !value.includes("T")) {
    value = value.replace(" ", "T");
  }
  if (/[+-]\d{2}$/.test(value)) {
    value = `${value}:00`;
  }
  if (/\d{2}:\d{2}:\d{2}$/.test(value)) {
    value = `${value}Z`;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function FocusPanel({ activeSession, todaySessions, tasks }: FocusPanelProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const hasActiveSession = Boolean(activeSession);
  const hasValidId = typeof activeSession?.id === "string" && looksLikeUuid(activeSession.id);
  const parsedStartedAtMs =
    typeof activeSession?.started_at === "string"
      ? parseTimestamptz(activeSession.started_at)
      : null;
  const hasValidStartedAt = Number.isFinite(parsedStartedAtMs ?? Number.NaN);
  const isActiveSessionValid = Boolean(activeSession) && hasValidId && hasValidStartedAt;
  const timeError = hasActiveSession && !hasValidStartedAt
    ? "Invalid start time. Refresh the page."
    : null;
  const isRunning = isActiveSessionValid;

  React.useEffect(() => {
    if (!activeSession || !isActiveSessionValid) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const next = Math.floor((Date.now() - (parsedStartedAtMs ?? 0)) / 1000);
      setElapsedSeconds(Math.max(0, next));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession, isActiveSessionValid, parsedStartedAtMs]);

  const activeTaskLabel = resolveTaskLabel(activeSession, tasks);

  async function handleStart() {
    if (isStarting || isStopping) return;
    setIsStarting(true);
    setError(null);

    const result = await startSession(selectedTaskId);

    if (!result.success) {
      setError(toEnglishError(result.error));
      setIsStarting(false);
      return;
    }

    setIsStarting(false);
    router.refresh();
  }

  async function handleStop() {
    if (!activeSession || !hasValidId || isStopping || isStarting) return;
    setIsStopping(true);
    setError(null);

    const result = await stopSession(activeSession.id);

    if (!result.success) {
      setError(toEnglishError(result.error));
      setIsStopping(false);
      return;
    }

    setIsStopping(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div
        className={[
          "space-y-3 rounded-2xl border bg-muted p-4",
          isRunning ? "border-emerald-200 ring-1 ring-emerald-100 shadow-sm" : "border-border",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IconFocus className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Active session
          </div>
          {isRunning ? <Badge variant="accent">Running</Badge> : null}
        </div>
        <p className="text-4xl font-semibold text-foreground">
          {isActiveSessionValid ? formatElapsed(elapsedSeconds) : "00m"}
        </p>
        {activeTaskLabel ? (
          <p className="text-sm text-muted-foreground">Task: {activeTaskLabel}</p>
        ) : null}
      </div>

      {timeError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {timeError}
        </p>
      ) : null}

      {!timeError && error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="task-select" className="text-sm font-medium text-foreground">
            Link a task
          </label>
          <select
            id="task-select"
            value={selectedTaskId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedTaskId(value.length > 0 ? value : null);
            }}
            disabled={hasActiveSession || isStarting || isStopping}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks available.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {hasActiveSession ? (
            <Button
              type="button"
              onClick={handleStop}
              disabled={isStopping || isStarting || !hasValidId}
            >
              {isStopping ? "Stopping..." : "Stop session"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              disabled={isStarting || isStopping}
            >
              {isStarting ? "Starting..." : "Start session"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today&apos;s sessions
        </h2>
        {todaySessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            No sessions yet today. Start one to begin.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {todaySessions.map((session) => {
              const taskLabel = resolveTaskLabel(session, tasks);
              return (
                <li key={session.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm text-foreground">
                    {formatStartTime(session.started_at)}
                    {taskLabel ? (
                      <div className="mt-1 text-xs text-muted-foreground">{taskLabel}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-end text-sm text-muted-foreground">
                    {session.ended_at
                      ? formatElapsed(session.duration_seconds ?? 0)
                      : <Badge variant="accent">Active</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function resolveTaskLabel(
  session: SessionRow | null,
  tasks: TaskRow[],
): string | null {
  if (!session?.task_id) return null;
  if (session.task_title) return session.task_title;
  const matched = tasks.find((task) => task.id === session.task_id);
  return matched?.title ?? "Task deleted";
}
