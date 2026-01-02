"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startSession, stopSession, SessionRow } from "@/app/actions/sessions";
import type { TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";

type FocusPanelProps = {
  activeSession: SessionRow | null;
  todaySessions: SessionRow[];
  tasks: TaskRow[];
};

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
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
    ? "Heure de demarrage invalide. Recharge la page."
    : null;

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
      setError(result.error);
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
      setError(result.error);
      setIsStopping(false);
      return;
    }

    setIsStopping(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-700">Session en cours</p>
        <p className="text-3xl font-semibold text-zinc-900">
          {isActiveSessionValid ? formatElapsed(elapsedSeconds) : "00m"}
        </p>
        {activeTaskLabel ? (
          <p className="text-sm text-zinc-500">Tache: {activeTaskLabel}</p>
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
          <label htmlFor="task-select" className="text-sm font-medium text-zinc-700">
            Associer une tache
          </label>
          <select
            id="task-select"
            value={selectedTaskId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedTaskId(value.length > 0 ? value : null);
            }}
            disabled={hasActiveSession || isStarting || isStopping}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Aucune tache</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          {tasks.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucune tache disponible.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {hasActiveSession ? (
            <Button
              type="button"
              onClick={handleStop}
              disabled={isStopping || isStarting || !hasValidId}
            >
              {isStopping ? "Arret..." : "Arreter la session"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              disabled={isStarting || isStopping}
            >
              {isStarting ? "Demarrage..." : "Demarrer une session"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Sessions du jour
        </h2>
        {todaySessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            Aucune session aujourd&apos;hui. Lance ta premiere session.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {todaySessions.map((session) => {
              const taskLabel = resolveTaskLabel(session, tasks);
              return (
                <li key={session.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm text-zinc-900">
                    {formatStartTime(session.started_at)}
                    {taskLabel ? (
                      <div className="mt-1 text-xs text-zinc-500">{taskLabel}</div>
                    ) : null}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {session.ended_at
                      ? formatElapsed(session.duration_seconds ?? 0)
                      : "Active"}
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
  return matched?.title ?? "Tache supprimee";
}
