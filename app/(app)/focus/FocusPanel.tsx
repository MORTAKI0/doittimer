"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import { addTaskToQueue, type TaskQueueRow } from "@/app/actions/queue";
import {
  computeElapsedSeconds,
  getPhaseDurationSeconds,
  type PomodoroPhase,
} from "@/lib/pomodoro/phaseEngine";
import { getNextUpTask } from "@/lib/queue/nextUp";
import { normalizeMusicUrl } from "@/lib/validation/session.schema";
import {
  DEFAULT_FOCUS_INTERVAL_MINUTES,
  FOCUS_INTERVAL_STORAGE_KEY,
  normalizeFocusIntervalMinutes,
} from "@/lib/focusInterval";
import { publishCrossTabEvent } from "@/lib/crossTab/channel";
import { useFocusLeader } from "@/lib/crossTab/leader";
import { scheduleRouteRefresh } from "@/lib/realtime/routeRefreshScheduler";
import { useIntervalBell } from "@/lib/useIntervalBell";
import type { TaskRow } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFocus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast";
import { FocusCircleTimer } from "./FocusCircleTimer";
import { ManualAddSessionModal } from "./ManualAddSessionModal";
import { SessionEditModal } from "./SessionEditModal";
import { datetimeLocalToIso } from "./sessionDateTime";

type FocusPanelProps = {
  activeSession: SessionRow | null;
  todaySessions: SessionRow[];
  selectedDay: string;
  totalFocusedSeconds: number;
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

function todayDateOnly() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDateOnly(value: string, deltaDays: number) {
  const source = new Date(`${value}T00:00:00.000Z`);
  source.setUTCDate(source.getUTCDate() + deltaDays);
  return source.toISOString().slice(0, 10);
}

type TaskPickerOption = {
  id: string | null;
  title: string;
  group: "Today Queue" | "Recent" | "All tasks";
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
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  selectedDay,
  totalFocusedSeconds,
  tasks,
  defaultTaskId,
  pomodoroDefaults,
  pomodoroEnabled,
  queueItems,
}: FocusPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLeader } = useFocusLeader();
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
  const [isQueueAddPending, setIsQueueAddPending] = React.useState(false);
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
  const [queue, setQueue] = React.useState<TaskQueueRow[]>(queueItems);
  const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
  const [taskQuery, setTaskQuery] = React.useState("");
  const [taskPickerHighlightedIndex, setTaskPickerHighlightedIndex] =
    React.useState(0);
  const [intervalBellMinutes, setIntervalBellMinutes] = React.useState(
    DEFAULT_FOCUS_INTERVAL_MINUTES,
  );
  const startHandlerRef = React.useRef<(() => Promise<void>) | null>(null);
  const stopHandlerRef = React.useRef<(() => Promise<void>) | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);
  const autoTransitionRef = React.useRef(false);
  const previousPhaseRef = React.useRef<string | null>(null);
  const wasRunningRef = React.useRef(false);
  const hasInitializedRunningRef = React.useRef(false);
  const hasActiveSession = Boolean(activeSession);
  const hasRunningSession = Boolean(activeSession && !activeSession.ended_at);
  const hasValidId =
    typeof activeSession?.id === "string" && looksLikeUuid(activeSession.id);
  const parsedStartedAtMs =
    typeof activeSession?.started_at === "string"
      ? parseTimestamptz(activeSession.started_at)
      : null;
  const hasValidStartedAt = Number.isFinite(parsedStartedAtMs ?? Number.NaN);
  const isActiveSessionValid =
    hasRunningSession && hasValidId && hasValidStartedAt;
  const timeError =
    hasActiveSession && !hasValidStartedAt
      ? "Invalid start time. Refresh the page."
      : null;
  const isRunning = hasRunningSession;
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
  const nextUp = queue[0] ?? null;
  const switchTarget = getNextUpTask(queue, activeSession?.task_id ?? null);
  const nextQueueItems = queue.slice(1, 4);
  const canSwitchToNextUp = Boolean(
    switchTarget &&
    !switchTarget.archived_at &&
    tasks.some((task) => task.id === switchTarget.task_id),
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
  const activeTasks = React.useMemo(
    () => tasks.filter((task) => !task.completed && task.archived_at == null),
    [tasks],
  );
  const activeTaskById = React.useMemo(
    () => new Map(activeTasks.map((task) => [task.id, task] as const)),
    [activeTasks],
  );
  const todayQueueTaskIds = React.useMemo(
    () => queue.map((item) => item.task_id),
    [queue],
  );
  const recentTaskIds = React.useMemo(() => {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const session of todaySessions) {
      if (!session.task_id) continue;
      if (seen.has(session.task_id)) continue;
      if (!activeTaskById.has(session.task_id)) continue;
      if (todayQueueTaskIds.includes(session.task_id)) continue;
      seen.add(session.task_id);
      output.push(session.task_id);
      if (output.length >= 5) break;
    }
    return output;
  }, [activeTaskById, todayQueueTaskIds, todaySessions]);
  const taskPickerOptions = React.useMemo(() => {
    const lower = taskQuery.trim().toLowerCase();
    const output: TaskPickerOption[] = [];
    const included = new Set<string>();
    const queueLabelById = new Map(queue.map((item) => [item.task_id, item.title] as const));

    for (const taskId of todayQueueTaskIds) {
      const task = activeTaskById.get(taskId);
      const title = task?.title ?? queueLabelById.get(taskId);
      if (!title) continue;
      if (lower && !title.toLowerCase().includes(lower)) continue;
      output.push({ id: taskId, title, group: "Today Queue" });
      included.add(taskId);
    }

    for (const taskId of recentTaskIds) {
      if (included.has(taskId)) continue;
      const task = activeTaskById.get(taskId);
      if (!task) continue;
      if (lower && !task.title.toLowerCase().includes(lower)) continue;
      output.push({ id: task.id, title: task.title, group: "Recent" });
      included.add(task.id);
    }

    for (const task of activeTasks) {
      if (included.has(task.id)) continue;
      if (lower && !task.title.toLowerCase().includes(lower)) continue;
      output.push({ id: task.id, title: task.title, group: "All tasks" });
    }

    return output;
  }, [activeTaskById, activeTasks, queue, recentTaskIds, taskQuery, todayQueueTaskIds]);
  const selectedTaskLabel = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId)?.title ?? "Task deleted"
    : "No task";
  const requestFocusRefresh = React.useCallback(
    (reason: string) => {
      scheduleRouteRefresh({
        routeKey: "/focus",
        reason,
        refresh: () => router.refresh(),
      });
    },
    [router],
  );
  const publishFocusEvent = React.useCallback(
    (
      type: "focus:session_changed" | "focus:pomodoro_changed",
      operation:
        | "start"
        | "stop"
        | "edit"
        | "manual_add"
        | "pause"
        | "resume"
        | "skip"
        | "restart"
        | "update",
      entityId?: string,
    ) => {
      publishCrossTabEvent({
        type,
        routeHint: "/focus",
        entityType: "sessions",
        entityId,
        operation,
      });
    },
    [],
  );

  const {
    requestNotificationPermission,
    isPermissionGranted,
    permissionState,
    playTestSound,
  } = useIntervalBell({
    enabled: isRunning,
    isLeader,
    intervalMinutes: intervalBellMinutes,
    title: "Focus interval",
  });

  React.useEffect(() => {
    if (!hasInitializedRunningRef.current) {
      hasInitializedRunningRef.current = true;
      wasRunningRef.current = isRunning;
      return;
    }
    if (isRunning && !wasRunningRef.current && isLeader) {
      void playTestSound();
    }
    wasRunningRef.current = isRunning;
  }, [isLeader, isRunning, playTestSound]);

  const handlePomodoroSkip = React.useCallback(async () => {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroSkipPhase(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    } else {
      publishFocusEvent("focus:pomodoro_changed", "skip", activeSession.id);
    }
    setIsPomodoroUpdating(false);
    requestFocusRefresh("mutation:pomodoro_skip");
  }, [
    activeSession,
    hasValidId,
    isPomodoroUpdating,
    publishFocusEvent,
    requestFocusRefresh,
  ]);

  React.useEffect(() => {
    if (hasActiveSession || hasManualSelection || !defaultTaskId) return;
    const exists = tasks.some((task) => task.id === defaultTaskId);
    if (!exists) return;
    setSelectedTaskId(defaultTaskId);
  }, [defaultTaskId, hasActiveSession, hasManualSelection, tasks]);

  React.useEffect(() => {
    setQueue(queueItems);
  }, [queueItems]);

  React.useEffect(() => {
    setTaskPickerHighlightedIndex(0);
  }, [taskPickerOptions]);

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
      const stored = window.localStorage.getItem(FOCUS_INTERVAL_STORAGE_KEY);
      if (!stored) {
        setIntervalBellMinutes(DEFAULT_FOCUS_INTERVAL_MINUTES);
        return;
      }
      setIntervalBellMinutes(normalizeFocusIntervalMinutes(stored));
    } catch {
      setIntervalBellMinutes(DEFAULT_FOCUS_INTERVAL_MINUTES);
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== FOCUS_INTERVAL_STORAGE_KEY) return;
      setIntervalBellMinutes(normalizeFocusIntervalMinutes(event.newValue));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "focus.fullscreen",
        isFullscreenMode ? "1" : "0",
      );
    } catch { }
  }, [isFullscreenMode]);

  React.useEffect(() => {
    if (!activeSession || !hasRunningSession || !isActiveSessionValid) {
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
  }, [
    activeSession,
    hasRunningSession,
    isActiveSessionValid,
    parsedStartedAtMs,
  ]);

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
    publishFocusEvent("focus:session_changed", "start", result.data.id);
    requestFocusRefresh("mutation:start");
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
    publishFocusEvent("focus:session_changed", "stop", activeSession.id);
    requestFocusRefresh("mutation:stop");
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
    } else {
      publishFocusEvent("focus:pomodoro_changed", "pause", activeSession.id);
    }
    setIsPomodoroUpdating(false);
    requestFocusRefresh("mutation:pomodoro_pause");
  }

  async function handlePomodoroResume() {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroResume(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    } else {
      publishFocusEvent("focus:pomodoro_changed", "resume", activeSession.id);
    }
    setIsPomodoroUpdating(false);
    requestFocusRefresh("mutation:pomodoro_resume");
  }

  async function handlePomodoroRestart() {
    if (!activeSession || !hasValidId || isPomodoroUpdating) return;
    setIsPomodoroUpdating(true);
    setError(null);
    const result = await pomodoroRestartPhase(activeSession.id);
    if (!result.success) {
      setError(toEnglishError(result.error));
    } else {
      publishFocusEvent("focus:pomodoro_changed", "restart", activeSession.id);
    }
    setIsPomodoroUpdating(false);
    requestFocusRefresh("mutation:pomodoro_restart");
  }

  function handleSwitchToNextUp() {
    if (!switchTarget || !canSwitchToNextUp || hasActiveSession) return;
    setHasManualSelection(true);
    setSelectedTaskId(switchTarget.task_id);
  }

  async function handleAddSelectedTaskToQueue() {
    if (!selectedTaskId || isQueueAddPending) return;
    setIsQueueAddPending(true);
    setError(null);

    const result = await addTaskToQueue(selectedTaskId);
    if (!result.success) {
      setError(toEnglishError(result.error));
      setIsQueueAddPending(false);
      return;
    }

    setQueue(result.data);
    setIsQueueAddPending(false);
    pushToast({ title: "Added to Today queue", variant: "success" });
    requestFocusRefresh("mutation:add_to_today_queue");
  }

  function updateSelectedDay(nextDay: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", nextDay);
    router.push(`${pathname}?${params.toString()}`);
  }

  function pickTask(taskId: string | null) {
    setHasManualSelection(true);
    setSelectedTaskId(taskId);
    setTaskPickerOpen(false);
  }

  function handleTaskPickerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!taskPickerOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        setTaskPickerOpen(true);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTaskPickerHighlightedIndex((prev) =>
        Math.min(prev + 1, Math.max(taskPickerOptions.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setTaskPickerHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = taskPickerOptions[taskPickerHighlightedIndex];
      if (option) {
        pickTask(option.id);
      } else {
        pickTask(null);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setTaskPickerOpen(false);
    }
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
    publishFocusEvent("focus:session_changed", "edit", result.data.id);
    requestFocusRefresh("mutation:edit");
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
    publishFocusEvent("focus:session_changed", "manual_add", result.data.id);
    requestFocusRefresh("mutation:manual_add");
  }

  async function handleEnableNotifications() {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      pushToast({ title: "Notifications enabled", variant: "success" });
      return;
    }
    if (permission === "denied") {
      pushToast({
        title: "Notifications blocked",
        description: "You can still use interval sound reminders.",
        variant: "info",
      });
    }
  }

  async function handleTestSound() {
    await playTestSound();
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
          "bg-muted/25 space-y-3 rounded-2xl border p-4 transition-all duration-300",
          isRunning
            ? "border-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.15)] ring-1 ring-emerald-100"
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
            {isRunning ? "Active session" : "Session"}
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? <Badge variant="accent">Running</Badge> : <Badge variant="neutral">Idle</Badge>}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFullscreenMode((v) => !v)}
            >
              {isFullscreenMode ? "Exit fullscreen" : "Fullscreen mode"}
            </Button>
          </div>
        </div>
        {isRunning ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              Session running
            </span>
            <span>Bell every {intervalBellMinutes}m</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleTestSound}
            >
              Test sound
            </Button>
            {isPermissionGranted ? (
              <Badge variant="accent">Notifications on</Badge>
            ) : null}
          </div>
        ) : null}
        {permissionState === "default" ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span>Browser notifications are off.</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleEnableNotifications}
            >
              Enable notifications
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-4">
          <div className={[
            "rounded-full p-1 transition-shadow duration-500",
            isRunning ? "shadow-[0_0_40px_rgba(16,185,129,0.2)]" : "",
          ].join(" ")}>
            <ProgressRing
              value={phaseProgress}
              size={240}
              strokeWidth={16}
              trackClassName="stroke-border/60"
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
              <FocusCircleTimer
                isRunning={isRunning && !isStopping}
                startedAt={activeSession?.started_at ?? null}
              />
            </ProgressRing>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">Space</kbd>
            <span>to start / stop</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {hasPomodoroPhase
            ? `${pomodoroPhaseLabel} remaining: ${formatElapsed(phaseRemainingSeconds ?? 0)}`
            : isRunning
              ? `Work remaining: ${formatElapsed(legacyRemainingSeconds)}`
              : `Work duration: ${effectivePomodoro.workMinutes}m`}
        </p>
        {hasPomodoroPhase && pomodoroPhaseLabel ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              pomodoroPhase === "work"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : pomodoroPhase === "long_break"
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : "border border-teal-200 bg-teal-50 text-teal-700",
            ].join(" ")}>
              <span className={[
                "h-1.5 w-1.5 rounded-full",
                pomodoroPhase === "work" ? "bg-emerald-500" : pomodoroPhase === "long_break" ? "bg-amber-500" : "bg-teal-500",
              ].join(" ")} />
              {pomodoroPhaseLabel}
            </span>
            {isPomodoroPaused ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                ⏸ Paused
              </span>
            ) : null}
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
        <h2 className="text-sm font-semibold text-foreground">
          Next up (Today queue)
        </h2>
        {nextUp ? (
          <div className="border-t-[0.5px] border-border" data-testid="next-up">
            <div className="task-row flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="task-title truncate">{nextUp.title}</p>
                <p className="task-meta">{nextUp.archived_at ? "Archived" : "Today queue"}</p>
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
            {nextQueueItems.length > 0 ? (
              <ul className="border-t-[0.5px] border-border">
                {nextQueueItems.map((item) => (
                  <li key={item.task_id} className="task-row">
                    <p className="task-title truncate">{item.title}</p>
                    <p className="task-meta">Position {item.sort_order + 1}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 border-t-[0.5px] border-border pt-4 text-sm text-muted-foreground">
            <p>No tasks in Today queue.</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/tasks"
                className="focus-ring ui-hover inline-flex h-9 items-center rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground hover:bg-muted"
              >
                Add tasks
              </a>
              {selectedTaskId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSelectedTaskToQueue}
                  isLoading={isQueueAddPending}
                  loadingLabel="Adding..."
                >
                  Add selected task to Today queue
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-foreground flex items-center gap-1.5 text-sm font-medium">
            Link a task
          </label>
          <p className="text-muted-foreground text-xs">
            Link a task (for this session).
          </p>
          <div className="space-y-2">
            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm text-foreground"
              onClick={() => setTaskPickerOpen((prev) => !prev)}
              disabled={hasActiveSession || isStarting || isStopping}
              aria-haspopup="listbox"
              aria-expanded={taskPickerOpen}
            >
              <span className="truncate">{selectedTaskLabel}</span>
              <span className="text-xs text-muted-foreground">Select</span>
            </button>
            {taskPickerOpen ? (
              <div className="space-y-2 rounded-xl border border-border bg-card p-2">
                <Input
                  value={taskQuery}
                  onChange={(event) => setTaskQuery(event.target.value)}
                  onKeyDown={handleTaskPickerKeyDown}
                  placeholder="Search tasks..."
                  autoFocus
                />
                <button
                  type="button"
                  className={[
                    "w-full rounded-lg px-2 py-1.5 text-left text-sm",
                    selectedTaskId === null ? "bg-emerald-50 text-emerald-800" : "hover:bg-muted",
                  ].join(" ")}
                  onClick={() => pickTask(null)}
                >
                  No task
                </button>
                <ul className="max-h-64 space-y-2 overflow-auto" role="listbox" aria-label="Task options">
                  {(["Today Queue", "Recent", "All tasks"] as const).map((groupName) => {
                    const groupItems = taskPickerOptions.filter((option) => option.group === groupName);
                    if (groupItems.length === 0) return null;
                    return (
                      <li key={groupName} className="space-y-1">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {groupName}
                        </p>
                        <ul className="space-y-1">
                          {groupItems.map((option) => {
                            const optionIndex = taskPickerOptions.findIndex((candidate) => candidate.id === option.id && candidate.group === option.group);
                            const highlighted = optionIndex === taskPickerHighlightedIndex;
                            const selected = selectedTaskId === option.id;
                            return (
                              <li key={`${option.group}:${option.id}`}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  className={[
                                    "w-full rounded-lg px-2 py-1.5 text-left text-sm",
                                    selected
                                      ? "bg-emerald-50 text-emerald-800"
                                      : highlighted
                                        ? "bg-muted text-foreground"
                                        : "text-foreground hover:bg-muted",
                                  ].join(" ")}
                                  onMouseEnter={() => setTaskPickerHighlightedIndex(optionIndex)}
                                  onClick={() => pickTask(option.id)}
                                >
                                  {option.title}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                  {taskPickerOptions.length === 0 ? (
                    <li className="px-2 py-1.5 text-xs text-muted-foreground">No matching tasks.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
          {activeTasks.length === 0 ? (
            <p className="text-muted-foreground text-xs">No active tasks available.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="music-url"
            className="text-foreground flex items-center gap-1.5 text-sm font-medium"
          >
            🎵 Music link (optional)
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
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-white shadow-md hover:from-emerald-700 hover:to-teal-700"
            >
              ▶ Start session
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
            Sessions
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              Total {formatElapsed(totalFocusedSeconds)}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => updateSelectedDay(shiftDateOnly(selectedDay, -1))}
          >
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedDay === todayDateOnly() ? "primary" : "secondary"}
            onClick={() => updateSelectedDay(todayDateOnly())}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => updateSelectedDay(shiftDateOnly(selectedDay, 1))}
          >
            Next
          </Button>
          <Input
            type="date"
            value={selectedDay}
            onChange={(event) => {
              if (!event.target.value) return;
              updateSelectedDay(event.target.value);
            }}
            className="h-9 w-[170px]"
            aria-label="Selected sessions day"
          />
        </div>
        {todaySessions.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No sessions for this day.
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

