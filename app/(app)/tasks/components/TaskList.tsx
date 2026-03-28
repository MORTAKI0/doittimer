"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  addTaskToQueue,
  getTaskQueue,
  moveTaskQueueDown,
  moveTaskQueueUp,
  removeTaskFromQueue,
  type TaskQueueRow,
} from "@/app/actions/queue";
import {
  deleteTask,
  restoreTask,
  setTaskCompleted,
  updateTaskDetails,
  updateTaskPomodoroOverrides,
  type TaskPomodoroOverrides,
  type TaskRow,
} from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconCheck, IconPencil, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import type { TaskPriority } from "@/lib/tasks/types";
import { DEFAULT_TASK_PRIORITY } from "@/lib/tasks/types";
import {
  pomodoroPresets,
  presetToOverrides,
  type PomodoroPreset,
} from "@/lib/pomodoro/presets";
import { AddTaskLauncher } from "./AddTaskLauncher";
import { DatePickerPopover } from "./DatePickerPopover";
import { PriorityPicker } from "./PriorityPicker";

type TaskListProps = {
  tasks: TaskRow[];
  projects?: { id: string; name: string }[];
  pomodoroStatsByTaskId?: Record<string, { pomodoros_today: number; pomodoros_total: number }>;
  queueItems?: TaskQueueRow[];
  currentRange?: "all" | "day" | "week";
  currentDate?: string;
  showQueueSection?: boolean;
  showListHeader?: boolean;
  allowInlineCreate?: boolean;
  inlineCreateDefaultScheduledFor?: string | null;
  inlineCreateDefaultProjectId?: string | null;
};

const EMPTY_QUEUE_ITEMS: TaskQueueRow[] = [];

const ERROR_MAP: Record<string, string> = {
  "Le titre est requis.": "Title is required.",
  "Le titre est trop long.": "Title is too long.",
  "Titre invalide.": "Invalid title.",
  "Identifiant invalide.": "Invalid identifier.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Impossible de creer la tache. Reessaie.": "Unable to create task. Try again.",
  "Impossible de mettre a jour la tache.": "Unable to update the task.",
  "Impossible de supprimer la tache.": "Unable to delete the task.",
  "Impossible de restaurer la tache.": "Unable to restore the task.",
  "Date invalide.": "Invalid date.",
  "Date invalide. Format attendu: YYYY-MM-DD.": "Invalid date format. Use YYYY-MM-DD.",
  "Parametres pomodoro invalides.": "Invalid pomodoro settings.",
  "Impossible de charger la file.": "Unable to load the queue.",
  "Impossible de mettre a jour la file.": "Unable to update the queue.",
  "Limite de 7 elements atteinte.": "Queue limit reached (7 items).",
  "Tache introuvable.": "Task not found.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
  "This task is managed in Notion. Edit it in Notion and sync again.": "This task is managed in Notion. Edit it in Notion and sync again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hydrateTask(task: TaskRow): TaskRow {
  return {
    ...task,
    description: task.description ?? null,
    priority: task.priority ?? DEFAULT_TASK_PRIORITY,
  };
}

function getPriorityTone(priority: TaskPriority) {
  switch (priority) {
    case 1:
      return "var(--destructive)";
    case 2:
      return "var(--warning)";
    case 3:
      return "var(--accent-bright)";
    default:
      return "var(--text-ghost)";
  }
}

function formatDueDateLabel(value: string | null) {
  if (!value) return null;

  const dueDate = new Date(`${value}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: `⚠ ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dueDate)}`,
      className: "text-due-overdue",
    };
  }
  if (diffDays === 0) return { label: "Today", className: "text-due-today" };
  if (diffDays === 1) return { label: "Tomorrow", className: "text-due-upcoming" };

  return {
    label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dueDate),
    className: "text-due-upcoming",
  };
}

function isManagedInNotion(task: TaskRow) {
  return task.read_only || task.source === "notion";
}

export function TaskList({
  tasks,
  projects = [],
  pomodoroStatsByTaskId = {},
  queueItems = EMPTY_QUEUE_ITEMS,
  currentRange = "all",
  currentDate = "",
  showQueueSection = true,
  showListHeader = true,
  allowInlineCreate = true,
  inlineCreateDefaultScheduledFor = null,
  inlineCreateDefaultProjectId = null,
}: TaskListProps) {
  const router = useRouter();
  const [queue, setQueue] = React.useState<TaskQueueRow[]>(queueItems);
  const [items, setItems] = React.useState<TaskRow[]>(() => tasks.map(hydrateTask));
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftDescription, setDraftDescription] = React.useState("");
  const [draftPriority, setDraftPriority] = React.useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [draftScheduledFor, setDraftScheduledFor] = React.useState<string | null>(null);
  const [draftProjectId, setDraftProjectId] = React.useState("");
  const [useCustomPomodoro, setUseCustomPomodoro] = React.useState(false);
  const [draftPomodoroWork, setDraftPomodoroWork] = React.useState("");
  const [draftPomodoroShort, setDraftPomodoroShort] = React.useState("");
  const [draftPomodoroLong, setDraftPomodoroLong] = React.useState("");
  const [draftPomodoroEvery, setDraftPomodoroEvery] = React.useState("");
  const [pendingIds, setPendingIds] = React.useState<Record<string, boolean>>({});
  const [queuePendingIds, setQueuePendingIds] = React.useState<Record<string, boolean>>({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>({});
  const [queueError, setQueueError] = React.useState<string | null>(null);
  const [queueOpen, setQueueOpen] = React.useState(true);
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const MAX_QUEUE_ITEMS = 7;

  React.useEffect(() => {
    setItems(tasks.map(hydrateTask));
  }, [tasks]);

  React.useEffect(() => {
    setQueue(queueItems);
  }, [queueItems]);

  function setPending(id: string, value: boolean) {
    setPendingIds((prev) => ({ ...prev, [id]: value }));
  }

  function setError(id: string, message: string | null) {
    setErrorsById((prev) => ({ ...prev, [id]: message }));
  }

  function setQueuePending(id: string, value: boolean) {
    setQueuePendingIds((prev) => ({ ...prev, [id]: value }));
  }

  React.useEffect(() => {
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftDescription, editingId]);

  function startEditing(task: TaskRow) {
    const hasOverrides = [
      task.pomodoro_work_minutes,
      task.pomodoro_short_break_minutes,
      task.pomodoro_long_break_minutes,
      task.pomodoro_long_break_every,
    ].some((value) => value != null);

    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftDescription(task.description ?? "");
    setDraftPriority(task.priority ?? DEFAULT_TASK_PRIORITY);
    setDraftScheduledFor(task.scheduled_for ?? null);
    setDraftProjectId(task.project_id ?? "");
    setUseCustomPomodoro(hasOverrides);
    setDraftPomodoroWork(typeof task.pomodoro_work_minutes === "number" ? String(task.pomodoro_work_minutes) : "");
    setDraftPomodoroShort(typeof task.pomodoro_short_break_minutes === "number" ? String(task.pomodoro_short_break_minutes) : "");
    setDraftPomodoroLong(typeof task.pomodoro_long_break_minutes === "number" ? String(task.pomodoro_long_break_minutes) : "");
    setDraftPomodoroEvery(typeof task.pomodoro_long_break_every === "number" ? String(task.pomodoro_long_break_every) : "");
    setError(task.id, null);
  }

  function cancelEditing() {
    if (editingId) setError(editingId, null);
    setEditingId(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftPriority(DEFAULT_TASK_PRIORITY);
    setDraftScheduledFor(null);
    setDraftProjectId("");
    setUseCustomPomodoro(false);
    setDraftPomodoroWork("");
    setDraftPomodoroShort("");
    setDraftPomodoroLong("");
    setDraftPomodoroEvery("");
  }

  function parseDraftNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatDraftValue(value: number | null) {
    return value == null ? "" : String(value);
  }

  async function handleToggle(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const nextCompleted = !task.completed;
    const previousCompleted = task.completed;

    setPending(task.id, true);
    setError(task.id, null);
    setItems((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item)));

    const result = await setTaskCompleted(task.id, nextCompleted);

    if (!result.success) {
      setItems((prev) => prev.map((item) => (item.id === task.id ? { ...item, completed: previousCompleted } : item)));
      setError(task.id, toEnglishError(result.error));
    } else {
      setItems((prev) => prev.map((item) => (item.id === task.id ? hydrateTask(result.data) : item)));
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleResetPomodoro(task: TaskRow) {
    if (pendingIds[task.id]) return;
    setPending(task.id, true);
    setError(task.id, null);

    const result = await updateTaskPomodoroOverrides(task.id, null);
    if (!result.success) {
      setError(task.id, toEnglishError(result.error));
      setPending(task.id, false);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === task.id ? hydrateTask(result.data) : item)));
    setUseCustomPomodoro(false);
    setDraftPomodoroWork("");
    setDraftPomodoroShort("");
    setDraftPomodoroLong("");
    setDraftPomodoroEvery("");
    setPending(task.id, false);
    router.refresh();
  }

  async function handleApplyPomodoroPreset(task: TaskRow, preset: PomodoroPreset) {
    if (pendingIds[task.id]) return;

    const overrides = presetToOverrides(preset);
    setUseCustomPomodoro(true);
    setDraftPomodoroWork(formatDraftValue(overrides.pomodoro_work_minutes));
    setDraftPomodoroShort(formatDraftValue(overrides.pomodoro_short_break_minutes));
    setDraftPomodoroLong(formatDraftValue(overrides.pomodoro_long_break_minutes));
    setDraftPomodoroEvery(formatDraftValue(overrides.pomodoro_long_break_every));
    setError(task.id, null);

    setPending(task.id, true);
    const result = await updateTaskPomodoroOverrides(task.id, {
      workMinutes: overrides.pomodoro_work_minutes,
      shortBreakMinutes: overrides.pomodoro_short_break_minutes,
      longBreakMinutes: overrides.pomodoro_long_break_minutes,
      longBreakEvery: overrides.pomodoro_long_break_every,
    });

    if (!result.success) {
      setError(task.id, toEnglishError(result.error));
      setPending(task.id, false);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === task.id ? hydrateTask(result.data) : item)));
    setPending(task.id, false);
    router.refresh();
  }

  async function handleSave(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const trimmedTitle = draftTitle.trim();
    const trimmedDescription = draftDescription.trim();
    const normalizedProjectId = draftProjectId.trim() !== "" ? draftProjectId : null;
    const normalizedDescription = trimmedDescription.length > 0 ? trimmedDescription : null;

    if (!trimmedTitle) {
      setError(task.id, "Title is required.");
      return;
    }

    setPending(task.id, true);
    setError(task.id, null);
    let updated: TaskRow = task;
    let shouldRefresh = false;
    const detailsChanged =
      trimmedTitle !== task.title ||
      normalizedDescription !== (task.description ?? null) ||
      draftPriority !== task.priority ||
      normalizedProjectId !== (task.project_id ?? null) ||
      (draftScheduledFor ?? null) !== (task.scheduled_for ?? null);

    if (detailsChanged) {
      const result = await updateTaskDetails(task.id, {
        title: trimmedTitle,
        description: normalizedDescription,
        priority: draftPriority,
        projectId: normalizedProjectId,
        scheduledFor: draftScheduledFor ?? null,
      });
      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }
      updated = result.data;
      shouldRefresh = true;
    }

    const currentOverrides: TaskPomodoroOverrides = {
      workMinutes: task.pomodoro_work_minutes ?? null,
      shortBreakMinutes: task.pomodoro_short_break_minutes ?? null,
      longBreakMinutes: task.pomodoro_long_break_minutes ?? null,
      longBreakEvery: task.pomodoro_long_break_every ?? null,
    };
    const nextOverrides: TaskPomodoroOverrides = useCustomPomodoro
      ? {
          workMinutes: parseDraftNumber(draftPomodoroWork),
          shortBreakMinutes: parseDraftNumber(draftPomodoroShort),
          longBreakMinutes: parseDraftNumber(draftPomodoroLong),
          longBreakEvery: parseDraftNumber(draftPomodoroEvery),
        }
      : { workMinutes: null, shortBreakMinutes: null, longBreakMinutes: null, longBreakEvery: null };

    const overridesChanged =
      currentOverrides.workMinutes !== nextOverrides.workMinutes ||
      currentOverrides.shortBreakMinutes !== nextOverrides.shortBreakMinutes ||
      currentOverrides.longBreakMinutes !== nextOverrides.longBreakMinutes ||
      currentOverrides.longBreakEvery !== nextOverrides.longBreakEvery;

    if (overridesChanged) {
      const result = await updateTaskPomodoroOverrides(task.id, useCustomPomodoro ? nextOverrides : null);
      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }
      updated = result.data;
      shouldRefresh = true;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === task.id ? hydrateTask(updated) : item,
      ),
    );

    cancelEditing();
    setPending(task.id, false);
    if (shouldRefresh) router.refresh();
  }

  async function handleDelete(task: TaskRow) {
    if (pendingIds[task.id]) return;
    if (!window.confirm("Delete this task?")) return;

    setPending(task.id, true);
    setError(task.id, null);

    const result = await deleteTask(task.id);
    if (!result.success) {
      setError(task.id, toEnglishError(result.error));
    } else {
      setItems((prev) => prev.map((item) => (item.id === task.id ? hydrateTask(result.data) : item)));
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleRestore(task: TaskRow) {
    if (pendingIds[task.id]) return;
    setPending(task.id, true);
    setError(task.id, null);

    const result = await restoreTask(task.id);
    if (!result.success) {
      setError(task.id, toEnglishError(result.error));
    } else {
      setItems((prev) => prev.map((item) => (item.id === task.id ? hydrateTask(result.data) : item)));
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleQueueRefresh() {
    const result = await getTaskQueue();
    if (!result.success) {
      setQueueError(toEnglishError(result.error));
      return;
    }
    setQueue(result.data);
  }

  async function handleQueueAdd(task: TaskRow) {
    if (queuePendingIds[task.id]) return;
    setQueuePending(task.id, true);
    setQueueError(null);

    const result = await addTaskToQueue(task.id);
    if (!result.success) {
      setQueueError(toEnglishError(result.error));
      setQueuePending(task.id, false);
      return;
    }

    setQueue(result.data);
    setQueuePending(task.id, false);
    router.refresh();
  }

  async function handleQueueRemove(taskId: string) {
    if (queuePendingIds[taskId]) return;
    setQueuePending(taskId, true);
    setQueueError(null);

    const result = await removeTaskFromQueue(taskId);
    if (!result.success) {
      setQueueError(toEnglishError(result.error));
      setQueuePending(taskId, false);
      return;
    }

    setQueue(result.data);
    setQueuePending(taskId, false);
    router.refresh();
  }

  async function handleQueueMoveUp(taskId: string) {
    if (queuePendingIds[taskId]) return;
    setQueuePending(taskId, true);
    setQueueError(null);

    const result = await moveTaskQueueUp(taskId);
    if (!result.success) {
      setQueueError(toEnglishError(result.error));
      setQueuePending(taskId, false);
      return;
    }

    setQueue(result.data);
    setQueuePending(taskId, false);
    router.refresh();
  }

  async function handleQueueMoveDown(taskId: string) {
    if (queuePendingIds[taskId]) return;
    setQueuePending(taskId, true);
    setQueueError(null);

    const result = await moveTaskQueueDown(taskId);
    if (!result.success) {
      setQueueError(toEnglishError(result.error));
      setQueuePending(taskId, false);
      return;
    }

    setQueue(result.data);
    setQueuePending(taskId, false);
    router.refresh();
  }

  const projectLabelById = React.useMemo(() => new Map(projects.map((project) => [project.id, project.name] as const)), [projects]);
  const queueIds = new Set(queue.map((item) => item.task_id));
  const queueIsFull = queue.length >= MAX_QUEUE_ITEMS;
  const visibleItems = items;

  return (
    <div className="space-y-6">
      {showQueueSection ? (
        <section className="rounded-md border-[0.5px] border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Today Queue</h2>
              <span className="text-xs text-muted-foreground">{queue.length}/{MAX_QUEUE_ITEMS}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" type="button" variant="secondary" onClick={() => setQueueOpen((prev) => !prev)}>
                {queueOpen ? "Collapse" : "Expand"}
              </Button>
              <Button size="sm" type="button" variant="secondary" onClick={handleQueueRefresh}>
                Refresh
              </Button>
            </div>
          </div>

          {queueError ? <p className="mt-3 text-sm text-red-600">{queueError}</p> : null}

          {queueOpen ? (
            queue.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Queue is empty. Add tasks below to prioritize your day.</p>
            ) : (
              <ul className="mt-3 border-t-[0.5px] border-border">
                {queue.map((item, index) => {
                  const isPending = Boolean(queuePendingIds[item.task_id]);
                  return (
                    <li key={item.task_id} className="task-row flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="task-title truncate">{item.title}</p>
                        <p className="task-meta">Position {index + 1}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="secondary" type="button" disabled={index === 0 || isPending} onClick={() => void handleQueueMoveUp(item.task_id)}>
                          Up
                        </Button>
                        <Button size="sm" variant="secondary" type="button" disabled={index === queue.length - 1 || isPending} onClick={() => void handleQueueMoveDown(item.task_id)}>
                          Down
                        </Button>
                        <Button size="sm" variant="danger" type="button" disabled={isPending} onClick={() => void handleQueueRemove(item.task_id)}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        {showListHeader ? (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Your Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {visibleItems.filter((task) => task.completed).length}/{visibleItems.length} completed
            </p>
          </div>
        ) : null}

        <ul className="border-t-[0.5px] border-border">
          {visibleItems.map((task) => {
            const isEditing = editingId === task.id;
            const isPending = Boolean(pendingIds[task.id]);
            const queuePending = Boolean(queuePendingIds[task.id]);
            const errorMessage = errorsById[task.id];
            const projectLabel = task.project_id ? projectLabelById.get(task.project_id) ?? "Project archived" : null;
            const stats = pomodoroStatsByTaskId[task.id];
            const duePresentation = formatDueDateLabel(task.scheduled_for ?? null);
            const isArchived = task.archived_at != null;
            const isManaged = isManagedInNotion(task);
            const priorityTone = getPriorityTone(task.priority);
            const showMetadata = Boolean(projectLabel) || Boolean(stats && stats.pomodoros_today > 0) || isArchived;

            return (
              <li key={task.id} className={["task-row", isArchived ? "opacity-80" : ""].join(" ")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-[10px]">
                      <button
                        type="button"
                        className={[
                          "focus-ring ui-hover mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border",
                          task.completed ? "bg-foreground text-background" : "bg-transparent hover:bg-muted",
                        ].join(" ")}
                        disabled={isPending || isArchived || isManaged}
                        onClick={() => void handleToggle(task)}
                        aria-label={task.completed ? `Mark ${task.title} as active` : `Mark ${task.title} as completed`}
                      >
                        {task.completed ? <IconCheck className="h-3 w-3" aria-hidden="true" /> : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: priorityTone }}
                            aria-hidden="true"
                          />
                          {queueIds.has(task.id) ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-secondary)]" aria-hidden="true" /> : null}
                          <p className={["task-title truncate", task.completed ? "task-title-completed" : ""].join(" ")}>{task.title}</p>
                          {isManaged ? <span className="shrink-0 text-xs text-muted-foreground">🔗</span> : null}
                        </div>
                        {showMetadata ? (
                          <div className="task-meta flex flex-wrap items-center gap-2">
                            {projectLabel ? <span>{projectLabel}</span> : null}
                            {stats && stats.pomodoros_today > 0 ? (
                              <>
                                {projectLabel ? <span aria-hidden="true">·</span> : null}
                                <span className="text-[11px]">🍅 {stats.pomodoros_today}</span>
                              </>
                            ) : null}
                            {isArchived ? <span>Archived</span> : null}
                          </div>
                        ) : null}
                      </div>

                      {duePresentation ? <span className={["task-date-chip shrink-0", duePresentation.className].join(" ")}>{duePresentation.label}</span> : null}
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {isArchived ? (
                        !isManaged ? (
                          <Button size="sm" type="button" variant="secondary" onClick={() => void handleRestore(task)} disabled={isPending}>
                            Restore
                          </Button>
                        ) : null
                      ) : (
                        <>
                          <Button size="sm" type="button" variant="secondary" onClick={() => void handleQueueAdd(task)} disabled={queueIds.has(task.id) || queueIsFull || isPending || queuePending}>
                            Add to queue
                          </Button>
                          {!isManaged ? (
                            <>
                              <Tooltip label="Edit task details">
                                <IconButton type="button" onClick={() => startEditing(task)} disabled={isPending} aria-label="Edit task">
                                  <IconPencil className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip label="Archive this task">
                                <IconButton type="button" variant="danger" onClick={() => void handleDelete(task)} disabled={isPending} aria-label="Archive task">
                                  <IconTrash className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-3 rounded-md border-[0.5px] border-border bg-card p-3">
                    <div className="space-y-3">
                      <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={500} disabled={isPending} aria-label="Task title" />
                      <textarea
                        ref={descriptionTextareaRef}
                        value={draftDescription}
                        onChange={(event) => setDraftDescription(event.target.value)}
                        maxLength={1000}
                        disabled={isPending}
                        aria-label="Task description"
                        placeholder="Description"
                        rows={1}
                        className="focus-ring w-full overflow-hidden rounded-md border-0 bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex flex-wrap gap-2">
                        <DatePickerPopover value={draftScheduledFor} onSelect={setDraftScheduledFor} />
                        <PriorityPicker value={draftPriority} onSelect={setDraftPriority} />
                        <label className="focus-ring ui-hover inline-flex h-9 items-center rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground">
                          <span className="mr-2" aria-hidden="true">📁</span>
                          <select value={draftProjectId} onChange={(event) => setDraftProjectId(event.target.value)} className="bg-transparent outline-none" disabled={isPending}>
                            <option value="">No project</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={useCustomPomodoro}
                            onChange={(event) => setUseCustomPomodoro(event.target.checked)}
                            disabled={isPending}
                            className="h-4 w-4 rounded-md border-border text-emerald-600"
                          />
                          Use custom Pomodoro
                        </label>
                        <div role="group" aria-label="Pomodoro presets" className="flex flex-wrap gap-2">
                          {pomodoroPresets.map((preset) => (
                            <Button key={preset.id} size="sm" type="button" variant="secondary" onClick={() => void handleApplyPomodoroPreset(task, preset)} disabled={isPending}>
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                        {useCustomPomodoro ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input type="number" min={1} max={240} step={1} value={draftPomodoroWork} onChange={(event) => setDraftPomodoroWork(event.target.value)} disabled={isPending} placeholder="Work minutes" />
                            <Input type="number" min={1} max={60} step={1} value={draftPomodoroShort} onChange={(event) => setDraftPomodoroShort(event.target.value)} disabled={isPending} placeholder="Short break" />
                            <Input type="number" min={1} max={120} step={1} value={draftPomodoroLong} onChange={(event) => setDraftPomodoroLong(event.target.value)} disabled={isPending} placeholder="Long break" />
                            <Input type="number" min={1} max={12} step={1} value={draftPomodoroEvery} onChange={(event) => setDraftPomodoroEvery(event.target.value)} disabled={isPending} placeholder="Long break every" />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {useCustomPomodoro ? (
                          <Button size="sm" type="button" variant="secondary" onClick={() => void handleResetPomodoro(task)} disabled={isPending}>
                            Reset defaults
                          </Button>
                        ) : null}
                        <Button size="sm" type="button" onClick={() => void handleSave(task)} disabled={isPending}>
                          Save
                        </Button>
                        <Button size="sm" type="button" variant="secondary" onClick={cancelEditing} disabled={isPending}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {errorMessage ? <p className="mt-2 text-sm text-red-600">{toEnglishError(errorMessage)}</p> : null}
              </li>
            );
          })}
        </ul>

        {allowInlineCreate ? (
          <AddTaskLauncher
            variant="nav"
            label="Add task"
            projects={projects}
            defaultScheduledFor={inlineCreateDefaultScheduledFor ?? (currentRange === "day" && currentDate ? currentDate : null)}
            defaultProjectId={inlineCreateDefaultProjectId}
          />
        ) : null}
      </section>
    </div>
  );
}
