"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  getActiveSessionDetails,
  startSession,
  stopSession,
  type ActiveSessionSnapshot,
  type SessionRow,
} from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconPlay } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { ACTIVE_SESSION_ERROR } from "@/lib/services/sessions";

type SessionStartControlProps = {
  activeSession: ActiveSessionSnapshot | null;
  taskId?: string | null;
  projectId?: string | null;
  label: string;
  tooltipLabel?: string;
  mode: "row" | "button";
  className?: string;
  onStarted?: () => void;
};

function toEnglishError(message: string) {
  switch (message) {
    case ACTIVE_SESSION_ERROR:
      return "A session is already running. Stop it before starting another.";
    case "Impossible de demarrer la session.":
      return "Unable to start the session.";
    case "Impossible d'arreter la session.":
      return "Unable to stop the current session.";
    case "Impossible de verifier la session active.":
      return "Unable to verify the active session.";
    case "Impossible de charger la session active.":
      return "Unable to load the active session.";
    case "Identifiant invalide.":
      return "Invalid identifier.";
    case "Erreur reseau. Verifie ta connexion et reessaie.":
      return "Network error. Check your connection and try again.";
    default:
      return message;
  }
}

function formatRunningLabel(session: SessionRow | null) {
  if (!session) return "Active session";
  if (session.task_title) return `Task: ${session.task_title}`;
  if (session.project_name) return `Project: ${session.project_name}`;
  return "Active session";
}

function matchesActiveSession(
  activeSession: ActiveSessionSnapshot | null,
  taskId?: string | null,
  projectId?: string | null,
) {
  if (!activeSession) return false;
  if (taskId && activeSession.taskId === taskId) return true;
  if (projectId && activeSession.projectId === projectId) return true;
  return false;
}

export function SessionStartControl({
  activeSession,
  taskId = null,
  projectId = null,
  label,
  tooltipLabel,
  mode,
  className,
  onStarted,
}: SessionStartControlProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conflictSession, setConflictSession] = React.useState<SessionRow | null>(null);
  const isActive = matchesActiveSession(activeSession, taskId, projectId);

  const refreshConflictSession = React.useCallback(async () => {
    const result = await getActiveSessionDetails();
    if (!result.success) {
      setError(toEnglishError(result.error));
      return null;
    }

    if (!result.data) {
      setConflictSession(null);
      return null;
    }

    setConflictSession(result.data);
    return result.data;
  }, []);

  const handleStart = React.useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const result = await startSession({
      taskId,
      projectId,
    });

    if (!result.success) {
      if (result.error === ACTIVE_SESSION_ERROR) {
        await refreshConflictSession();
      } else {
        setError(toEnglishError(result.error));
      }
      setIsSubmitting(false);
      return;
    }

    setConflictSession(null);
    setIsSubmitting(false);
    router.refresh();
    onStarted?.();
  }, [isSubmitting, onStarted, projectId, refreshConflictSession, router, taskId]);

  const handleStopAndRetry = React.useCallback(async () => {
    if (isSubmitting || !conflictSession) return;

    setIsSubmitting(true);
    setError(null);

    const stopResult = await stopSession(conflictSession.id);
    if (!stopResult.success) {
      setError(toEnglishError(stopResult.error));
      setIsSubmitting(false);
      return;
    }

    const retryResult = await startSession({
      taskId,
      projectId,
    });

    if (!retryResult.success) {
      if (retryResult.error === ACTIVE_SESSION_ERROR) {
        await refreshConflictSession();
      } else {
        setError(toEnglishError(retryResult.error));
      }
      setIsSubmitting(false);
      return;
    }

    setConflictSession(null);
    setIsSubmitting(false);
    router.refresh();
    onStarted?.();
  }, [conflictSession, isSubmitting, onStarted, projectId, refreshConflictSession, router, taskId]);

  if (isActive) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Live
      </span>
    );
  }

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div
        className={
          mode === "row" && !conflictSession
            ? "opacity-0 transition-opacity group-hover:opacity-100"
            : "opacity-100"
        }
      >
        {mode === "row" ? (
          <Tooltip label={tooltipLabel ?? label}>
            <IconButton
              type="button"
              onClick={() => void handleStart()}
              disabled={isSubmitting}
              aria-label={tooltipLabel ?? label}
              className="shrink-0"
            >
              <IconPlay className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            type="button"
            onClick={() => void handleStart()}
            isLoading={isSubmitting}
            loadingLabel="Starting..."
          >
            {label}
          </Button>
        )}
      </div>

      {conflictSession ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-medium">Stop current session?</p>
          <p className="mt-1 text-amber-700">{formatRunningLabel(conflictSession)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => void handleStopAndRetry()}
              isLoading={isSubmitting}
              loadingLabel="Stopping..."
            >
              Stop current session
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConflictSession(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
