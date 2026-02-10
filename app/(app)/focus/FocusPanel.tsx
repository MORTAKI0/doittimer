"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  addManualSession,
  editSession,
  startSession,
  stopSession,
  SessionRow,
} from "@/app/actions/sessions";
import {
  pomodoroInit,
  pomodoroPause,
  pomodoroResume,
  pomodoroSkipPhase,
  pomodoroRestartPhase,
} from "@/app/actions/pomodoro";
import type { TaskQueueRow } from "@/app/actions/queue";
import {
  computeElapsedSeconds,
  getPhaseDurationSeconds,
  type PomodoroPhase,
} from "@/lib/pomodoro/phaseEngine";
import { getNextUpTask } from "@/lib/queue/nextUp";
import { normalizeMusicUrl } from "@/lib/validation/session.schema";
import type { TaskRow } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFocus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ManualAddSessionModal } from "./ManualAddSessionModal";
import { SessionEditModal } from "./SessionEditModal";
import { datetimeLocalToIso } from "./sessionDateTime";

type FocusPanelProps = {
  activeSession: SessionRow | null;
  todaySessions: SessionRow[];
  tasks: TaskRow[];
  defaultTaskId: string | null;
  pomodoroDefaults: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakEvery: number;
  };
  pomodoroEnabled: boolean;
  queueItems: TaskQueueRow[];
};

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Identifiant invalide.": "Invalid identifier.",
  "Une session est deja active. Arrete-la avant d'en demarrer une autre.":
    "A session is already active. Stop it before starting a new one.",
  "Impossible de verifier la session active.":
    "Unable to verify the active session.",
  "Impossible de demarrer la session.": "Unable to start the session.",
  "Impossible d'arreter la session.": "Unable to stop the session.",
  "Impossible de charger la session active.":
    "Unable to load the active session.",
  "Impossible de charger les sessions du jour.":
    "Unable to load today's sessions.",
  "Impossible de modifier la session.": "Unable to edit the session.",
  "Impossible d'ajouter la session.": "Unable to add the session.",
  "Impossible de modifier une session active.":
    "Cannot edit an active session.",
  "L'heure de fin doit etre superieure ou egale a l'heure de debut.":
    "End time must be after start time.",
  "La duree maximale est de 12 heures.":
    "Session duration cannot exceed 12 hours.",
  "Tu ne peux modifier que tes sessions.":
    "You can only edit your own sessions.",
  "Parametres invalides.": "Invalid parameters.",
  "Lien musical invalide.": "Invalid music link.",
  "Erreur reseau. Verifie ta connexion et reessaie.":
    "Network error. Check your connection and try again.",
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
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClock(seconds: number) {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatPomodoroPhase(phase: string | null | undefined) {
  switch (phase) {
    case "short_break":
      return "Short Break";
    case "long_break":
      return "Long Break";
    case "work":
      return "Work";
    default:
      return "Work";
  }
}

function resolveEffectivePomodoro(
  task: TaskRow | null,
  defaults: FocusPanelProps["pomodoroDefaults"],
) {
  return {
    workMinutes: task?.pomodoro_work_minutes ?? defaults.workMinutes,
    shortBreakMinutes:
      task?.pomodoro_short_break_minutes ?? defaults.shortBreakMinutes,
    longBreakMinutes:
      task?.pomodoro_long_break_minutes ?? defaults.longBreakMinutes,
    longBreakEvery: task?.pomodoro_long_break_every ?? defaults.longBreakEvery,
  };
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const interactive = target.closest("button, a, input, textarea, select");
  if (interactive) return true;

  return Boolean(target.closest('[role="button"], [role="link"]'));
}

/** Focus session control panel with task linking, pomodoro controls, and queue handoff. */
export function FocusPanel({
  activeSession,
  todaySessions,
  tasks,
  defaultTaskId,
  pomodoroDefaults,
  pomodoroEnabled,
  queueItems,
}: FocusPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [isStarting, setIsStarting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [phaseRemainingSeconds, setPhaseRemainingSeconds] = React.useState<
    number | null
  >(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(
    null,
  );
  const [hasManualSelection, setHasManualSelection] = React.useState(false);
  const [musicUrl, setMusicUrl] = React.useState("");
  const [isPomodoroUpdating, setIsPomodoroUpdating] = React.useState(false);
  const [isEditingSession, setIsEditingSession] = React.useState(false);
  const [isAddingManualSession, setIsAddingManualSession] =
    React.useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<SessionRow | null>(
    null,
  );
  const [editError, setEditError] = React.useState<string | null>(null);
  const [manualAddError, setManualAddError] = React.useState<string | null>(
    null,
  );
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = React.useState(false);
  const startHandlerRef = React.useRef<(() => Promise<void>) | null>(null);
  const stopHandlerRef = React.useRef<(() => Promise<void>) | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);
  const autoTransitionRef = React.useRef(false);
  const previousPhaseRef = React.useRef<string | null>(null);
  const hasActiveSession = Boolean(activeSession);
  const hasValidId =
    typeof activeSession?.id === "string" && looksLikeUuid(activeSession.id);
  const parsedStartedAtMs =
    typeof activeSession?.started_at === "string"
      ? parseTimestamptz(activeSession.started_at)
      : null;
  const hasValidStartedAt = Number.isFinite(parsedStartedAtMs ?? Number.NaN);
  const isActiveSessionValid =
    Boolean(activeSession) && hasValidId && hasValidStartedAt;
  const timeError =
    hasActiveSession && !hasValidStartedAt
      ? "Invalid start time. Refresh the page."
      : null;
  const isRunning = isActiveSessionValid;
  const pomodoroPhase = pomodoroEnabled
    ? (activeSession?.pomodoro_phase ?? null)
    : null;
  const hasPomodoroPhase = pomodoroEnabled && typeof pomodoroPhase === "string";
  const pomodoroPhaseLabel = hasPomodoroPhase
    ? formatPomodoroPhase(pomodoroPhase)
    : null;
  const isPomodoroPaused = hasPomodoroPhase
    ? Boolean(activeSession?.pomodoro_is_paused)
    : false;
  const effectiveTaskId = activeSession?.task_id ?? selectedTaskId;
  const effectiveTask = effectiveTaskId
    ? (tasks.find((task) => task.id === effectiveTaskId) ?? null)
    : null;
  const effectivePomodoro = resolveEffectivePomodoro(
    effectiveTask,
    pomodoroDefaults,
  );
  const legacyRemainingSeconds = Math.max(
    0,
    effectivePomodoro.workMinutes * 60 - elapsedSeconds,
  );
  const parsedPhaseStartedAtMs =
    hasPomodoroPhase &&
    typeof activeSession?.pomodoro_phase_started_at === "string"
      ? parseTimestamptz(activeSession.pomodoro_phase_started_at)
      : null;
  const parsedPausedAtMs =
    hasPomodoroPhase && typeof activeSession?.pomodoro_paused_at === "string"
      ? parseTimestamptz(activeSession.pomodoro_paused_at)
      : null;
  const phaseDurationSeconds = hasPomodoroPhase
    ? getPhaseDurationSeconds(pomodoroPhase as PomodoroPhase, effectivePomodoro)
    : null;
  const nextUp = getNextUpTask(queueItems, activeSession?.task_id ?? null);
  const canSwitchToNextUp = Boolean(
    nextUp &&
    !nextUp.archived_at &&
    tasks.some((task) => task.id === nextUp.task_id),
  );
  const phaseProgress = hasPomodoroPhase
    ? 1 -
      Math.max(
        0,
        Math.min(
          1,
          (phaseRemainingSeconds ?? 0) / Math.max(1, phaseDurationSeconds ?? 1),
        ),
      )
    : 1 -
      Math.max(
        0,
        Math.min(
          1,
          legacyRemainingSeconds /
            Math.max(1, effectivePomodoro.workMinutes * 60),
        ),
      );
  const totalFocusedSecondsToday = todaySessions.reduce(
    (sum, session) => sum + (session.duration_seconds ?? 0),
    0,
  );

  const handlePomodoroSkip = React.useCallback(async () => {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroSkipPhase(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    }
    setIsPomodoroUpdating(false);
    router.refresh();
  }, [activeSession, hasValidId, isPomodoroUpdating, router]);

  React.useEffect(() => {
    if (hasActiveSession || hasManualSelection || !defaultTaskId) return;
    const exists = tasks.some((task) => task.id === defaultTaskId);
    if (!exists) return;
    setSelectedTaskId(defaultTaskId);
  }, [defaultTaskId, hasActiveSession, hasManualSelection, tasks]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("focus.fullscreen");
      setIsFullscreenMode(stored === "1");
    } catch {
      setIsFullscreenMode(false);
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "focus.fullscreen",
        isFullscreenMode ? "1" : "0",
      );
    } catch {}
  }, [isFullscreenMode]);

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

  React.useEffect(() => {
    if (!hasPomodoroPhase || !activeSession) {
      setPhaseRemainingSeconds(null);
      return;
    }
    if (
      !parsedPhaseStartedAtMs ||
      !Number.isFinite(phaseDurationSeconds ?? NaN)
    ) {
      setPhaseRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const elapsed = computeElapsedSeconds(
        parsedPhaseStartedAtMs,
        Date.now(),
        isPomodoroPaused ? (parsedPausedAtMs ?? null) : null,
      );
      const remaining = Math.max(0, (phaseDurationSeconds ?? 0) - elapsed);
      setPhaseRemainingSeconds(remaining);

      if (
        remaining <= 0 &&
        !isPomodoroPaused &&
        !isPomodoroUpdating &&
        !autoTransitionRef.current
      ) {
        autoTransitionRef.current = true;
        void handlePomodoroSkip();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [
    activeSession,
    handlePomodoroSkip,
    hasPomodoroPhase,
    isPomodoroPaused,
    isPomodoroUpdating,
    parsedPhaseStartedAtMs,
    parsedPausedAtMs,
    phaseDurationSeconds,
  ]);

  React.useEffect(() => {
    autoTransitionRef.current = false;
  }, [pomodoroPhase, activeSession?.pomodoro_phase_started_at]);

  React.useEffect(() => {
    if (!hasPomodoroPhase) {
      previousPhaseRef.current = null;
      return;
    }
    const currentPhase = pomodoroPhase;
    const previousPhase = previousPhaseRef.current;
    if (previousPhase && currentPhase && previousPhase !== currentPhase) {
      const message =
        currentPhase === "work"
          ? "Work started"
          : currentPhase === "long_break"
            ? "Long break started"
            : "Short break started";
      setToastMessage(message);
      pushToast({ title: message, variant: "info" });
    }
    previousPhaseRef.current = currentPhase;
  }, [hasPomodoroPhase, pomodoroPhase, pushToast]);

  React.useEffect(() => {
    if (!toastMessage) return;
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2500);
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [toastMessage]);

  const activeTaskLabel = resolveTaskLabel(activeSession, tasks);

  async function handleStart() {
    if (isStarting || isStopping) return;
    setIsStarting(true);
    setError(null);

    const normalizedMusicUrl = normalizeMusicUrl(musicUrl);
    if (normalizedMusicUrl.error) {
      setError(toEnglishError(normalizedMusicUrl.error));
    }

    const result = await startSession(selectedTaskId, normalizedMusicUrl.value);

    if (!result.success) {
      setError(toEnglishError(result.error));
      setIsStarting(false);
      return;
    }

    if (pomodoroEnabled && result.data?.id) {
      setIsPomodoroUpdating(true);
      const pomodoroResult = await pomodoroInit(result.data.id);
      if (!pomodoroResult.success) {
        setError(toEnglishError(pomodoroResult.error));
      }
      setIsPomodoroUpdating(false);
    }

    setIsStarting(false);
    setMusicUrl("");
    pushToast({ title: "Focus session started", variant: "success" });
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
    pushToast({ title: "Focus session stopped", variant: "info" });
    router.refresh();
  }

  React.useEffect(() => {
    startHandlerRef.current = handleStart;
    stopHandlerRef.current = handleStop;
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.code !== "Space" ||
        event.defaultPrevented ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      if (hasActiveSession) {
        void stopHandlerRef.current?.();
      } else {
        void startHandlerRef.current?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasActiveSession]);

  async function handlePomodoroPause() {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroPause(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    }
    setIsPomodoroUpdating(false);
    router.refresh();
  }

  async function handlePomodoroResume() {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroResume(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    }
    setIsPomodoroUpdating(false);
    router.refresh();
  }

  async function handlePomodoroRestart() {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroRestartPhase(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    }
    setIsPomodoroUpdating(false);
    router.refresh();
  }

  function handleSwitchToNextUp() {
    if (!nextUp || !canSwitchToNextUp || hasActiveSession) return;
    setHasManualSelection(true);
    setSelectedTaskId(nextUp.task_id);
  }

  async function handleEditSubmit(values: {
    startedAt: string;
    endedAt: string;
    taskId: string | null;
    editReason: string;
  }) {
    if (!editingSession) return;

    const startedAtIso = datetimeLocalToIso(values.startedAt);
    const endedAtIso = datetimeLocalToIso(values.endedAt);

    if (!startedAtIso || !endedAtIso) {
      setEditError("Invalid date value.");
      return;
    }

    setEditError(null);
    setIsEditingSession(true);
    const result = await editSession({
      sessionId: editingSession.id,
      startedAt: startedAtIso,
      endedAt: endedAtIso,
      taskId: values.taskId,
      editReason: values.editReason,
    });

    if (!result.success) {
      setEditError(toEnglishError(result.error));
      setIsEditingSession(false);
      return;
    }

    setIsEditingSession(false);
    setEditingSession(null);
    setEditError(null);
    pushToast({ title: "Session updated", variant: "success" });
    router.refresh();
  }

  async function handleManualAddSubmit(values: {
    startedAt: string;
    endedAt: string;
    taskId: string | null;
  }) {
    const startedAtIso = datetimeLocalToIso(values.startedAt);
    const endedAtIso = datetimeLocalToIso(values.endedAt);

    if (!startedAtIso || !endedAtIso) {
      const message = "Invalid date value.";
      setManualAddError(message);
      pushToast({ title: message, variant: "error" });
      return;
    }

    setManualAddError(null);
    setIsAddingManualSession(true);
    const result = await addManualSession({
      startedAt: startedAtIso,
      endedAt: endedAtIso,
      taskId: values.taskId,
    });

    if (!result.success) {
      const message = toEnglishError(result.error);
      setManualAddError(message);
      pushToast({ title: message, variant: "error" });
      setIsAddingManualSession(false);
      return;
    }

    setIsAddingManualSession(false);
    setManualAddError(null);
    setIsManualModalOpen(false);
    pushToast({ title: "Session added", variant: "success" });
    router.refresh();
  }

  return (
    <div
      className={[
        "space-y-6",
        isFullscreenMode ? "mx-auto max-w-2xl" : "",
      ].join(" ")}
    >
      <div
        className={[
          "bg-muted/25 space-y-3 rounded-2xl border p-4",
          isRunning
            ? "border-emerald-200 shadow-sm ring-1 ring-emerald-100"
            : "border-border",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <IconFocus
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
            Active session
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? <Badge variant="accent">Running</Badge> : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFullscreenMode((v) => !v)}
            >
              {isFullscreenMode ? "Exit fullscreen" : "Fullscreen mode"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ProgressRing
            value={phaseProgress}
            size={220}
            strokeWidth={12}
            trackClassName="stroke-border"
            indicatorClassName={
              hasPomodoroPhase
                ? pomodoroPhase === "work"
                  ? "stroke-emerald-500"
                  : pomodoroPhase === "long_break"
                    ? "stroke-amber-500"
                    : "stroke-teal-500"
                : "stroke-emerald-500"
            }
          >
            <p className="numeric-tabular text-foreground text-5xl font-semibold tracking-tight sm:text-6xl">
              {isActiveSessionValid ? formatClock(elapsedSeconds) : "00:00:00"}
            </p>
          </ProgressRing>
          <p className="text-muted-foreground text-xs">
            Shortcut: press Space to start/stop
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {hasPomodoroPhase
            ? `${pomodoroPhaseLabel} remaining: ${formatElapsed(phaseRemainingSeconds ?? 0)}`
            : isRunning
              ? `Work remaining: ${formatElapsed(legacyRemainingSeconds)}`
              : `Work duration: ${effectivePomodoro.workMinutes}m`}
        </p>
        {hasPomodoroPhase && pomodoroPhaseLabel ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span>Phase:</span>
            <Badge variant="neutral">{pomodoroPhaseLabel}</Badge>
            {isPomodoroPaused ? <Badge variant="neutral">Paused</Badge> : null}
          </div>
        ) : null}
        {activeTaskLabel ? (
          <p className="text-muted-foreground text-sm">
            Task: {activeTaskLabel}
          </p>
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
      {toastMessage ? (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Next up
        </h2>
        {nextUp ? (
          <div
            className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            data-testid="next-up"
          >
            <div className="text-foreground flex items-center gap-2 text-sm">
              <span>{nextUp.title}</span>
              {nextUp.archived_at ? (
                <Badge variant="neutral">Archived</Badge>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSwitchToNextUp}
              disabled={hasActiveSession || !canSwitchToNextUp}
              aria-label="Switch to next up"
              data-testid="next-up-switch"
              variant="secondary"
            >
              Switch
            </Button>
          </div>
        ) : (
          <p className="border-border bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No tasks in Today queue.{" "}
            <a href="/tasks" className="text-emerald-600">
              Add tasks
            </a>
            .
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="task-select"
            className="text-foreground text-sm font-medium"
          >
            Link a task
          </label>
          <Select
            id="task-select"
            value={selectedTaskId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setHasManualSelection(true);
              setSelectedTaskId(value.length > 0 ? value : null);
            }}
            disabled={hasActiveSession || isStarting || isStopping}
          >
            <option value="">No task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-xs">No tasks available.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="music-url"
            className="text-foreground text-sm font-medium"
          >
            Music link (optional)
          </label>
          <Input
            id="music-url"
            type="url"
            inputMode="url"
            placeholder="https://open.spotify.com/..."
            value={musicUrl}
            onChange={(event) => {
              setMusicUrl(event.target.value);
              if (error) setError(null);
            }}
            disabled={hasActiveSession || isStarting || isStopping}
            data-testid="focus-music-url"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {hasActiveSession ? (
            <Button
              type="button"
              onClick={handleStop}
              isLoading={isStopping}
              loadingLabel="Stopping..."
              disabled={isStarting || !hasValidId}
              variant="danger"
            >
              Stop session
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              isLoading={isStarting}
              loadingLabel="Starting..."
              disabled={isStopping}
            >
              Start session
            </Button>
          )}
        </div>

        {hasPomodoroPhase ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Pomodoro controls
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handlePomodoroPause}
                isLoading={isPomodoroUpdating}
                loadingLabel="Updating..."
                disabled={!hasActiveSession || !hasValidId || isPomodoroPaused}
              >
                Pause
              </Button>
              <Button
                type="button"
                onClick={handlePomodoroResume}
                isLoading={isPomodoroUpdating}
                loadingLabel="Updating..."
                disabled={!hasActiveSession || !hasValidId || !isPomodoroPaused}
              >
                Resume
              </Button>
              <Button
                type="button"
                onClick={handlePomodoroSkip}
                isLoading={isPomodoroUpdating}
                loadingLabel="Updating..."
                disabled={!hasActiveSession || !hasValidId}
              >
                Skip phase
              </Button>
              <Button
                type="button"
                onClick={handlePomodoroRestart}
                isLoading={isPomodoroUpdating}
                loadingLabel="Updating..."
                disabled={!hasActiveSession || !hasValidId}
              >
                Restart phase
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Today&apos;s sessions
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              Total {formatElapsed(totalFocusedSecondsToday)}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setManualAddError(null);
                setIsManualModalOpen(true);
              }}
            >
              Add session
            </Button>
          </div>
        </div>
        {todaySessions.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No sessions yet today. Start one to begin.
          </p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {todaySessions.map((session) => {
              const taskLabel = resolveTaskLabel(session, tasks);
              const isFinishedSession = Boolean(session.ended_at);
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="text-foreground text-sm">
                    {formatStartTime(session.started_at)}
                    {taskLabel ? (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {taskLabel}
                      </div>
                    ) : null}
                    {session.music_url ? (
                      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-2 2" />
                          <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l2-2" />
                        </svg>
                        <a
                          href={session.music_url}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-[220px] truncate text-emerald-600 hover:text-emerald-700"
                          data-testid="session-music-link"
                        >
                          {session.music_url}
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground flex items-center justify-end gap-2 text-sm">
                    {isFinishedSession ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingSession(session);
                          setEditError(null);
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {isFinishedSession ? (
                      formatElapsed(session.duration_seconds ?? 0)
                    ) : (
                      <Badge variant="accent">Active</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SessionEditModal
        open={Boolean(editingSession)}
        session={editingSession}
        tasks={tasks}
        isSubmitting={isEditingSession}
        error={editError}
        onClose={() => {
          if (isEditingSession) return;
          setEditingSession(null);
          setEditError(null);
        }}
        onSubmit={handleEditSubmit}
      />
      <ManualAddSessionModal
        open={isManualModalOpen}
        tasks={tasks}
        isSubmitting={isAddingManualSession}
        error={manualAddError}
        onClose={() => {
          if (isAddingManualSession) return;
          setIsManualModalOpen(false);
          setManualAddError(null);
        }}
        onSubmit={handleManualAddSubmit}
        onValidationError={(message) => {
          setManualAddError(message);
          pushToast({ title: message, variant: "error" });
        }}
      />
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
