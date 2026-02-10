"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  addTaskToQueue,
  getTaskQueue,
  moveTaskQueueDown,
  moveTaskQueueUp,
  removeTaskFromQueue,
  TaskQueueRow,
} from "@/app/actions/queue";
import {
  deleteTask,
  restoreTask,
  setTaskCompleted,
  setTaskScheduledFor,
  updateTaskPomodoroOverrides,
  updateTaskProject,
  updateTaskTitle,
  TaskPomodoroOverrides,
  TaskRow,
} from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import {
  pomodoroPresets,
  presetToOverrides,
  type PomodoroPreset,
} from "@/lib/pomodoro/presets";

type TaskListProps = {
  tasks: TaskRow[];
  projects?: { id: string; name: string }[];
  pomodoroStatsByTaskId?: Record<string, { pomodoros_today: number; pomodoros_total: number }>;
  queueItems?: TaskQueueRow[];
  currentRange?: "all" | "day" | "week";
  currentDate?: string;
};

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

export function TaskList({
  tasks,
  projects = [],
  pomodoroStatsByTaskId = {},
  queueItems = [],
  currentRange = "all",
  currentDate = "",
}: TaskListProps) {
  const router = useRouter();
  const [queue, setQueue] = React.useState<TaskQueueRow[]>(queueItems);
  const [items, setItems] = React.useState<TaskRow[]>(tasks);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
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
  const MAX_QUEUE_ITEMS = 7;
  const canSetToFilterDate = currentRange === "day" && currentDate.trim() !== "";

  React.useEffect(() => {
    setItems(tasks);
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

  function startEditing(task: TaskRow) {
    const hasOverrides = [
      task.pomodoro_work_minutes,
      task.pomodoro_short_break_minutes,
      task.pomodoro_long_break_minutes,
      task.pomodoro_long_break_every,
    ].some((value) => value != null);
    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftProjectId(task.project_id ?? "");
    setUseCustomPomodoro(hasOverrides);
    setDraftPomodoroWork(typeof task.pomodoro_work_minutes === "number" ? String(task.pomodoro_work_minutes) : "");
    setDraftPomodoroShort(typeof task.pomodoro_short_break_minutes === "number" ? String(task.pomodoro_short_break_minutes) : "");
    setDraftPomodoroLong(typeof task.pomodoro_long_break_minutes === "number" ? String(task.pomodoro_long_break_minutes) : "");
    setDraftPomodoroEvery(typeof task.pomodoro_long_break_every === "number" ? String(task.pomodoro_long_break_every) : "");
    setError(task.id, null);
  }

  function cancelEditing() {
    if (editingId) {
      setError(editingId, null);
    }
    setEditingId(null);
    setDraftTitle("");
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
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleSetScheduledFor(task: TaskRow, scheduledFor: string | null) {
    if (pendingIds[task.id]) return;
    const previousScheduledFor = task.scheduled_for ?? null;
    if (previousScheduledFor === scheduledFor) return;

    setPending(task.id, true);
    setError(task.id, null);
    setItems((prev) => prev.map((item) => (item.id === task.id ? { ...item, scheduled_for: scheduledFor } : item)));

    const result = await setTaskScheduledFor(task.id, scheduledFor);

    if (!result.success) {
      setItems((prev) => prev.map((item) => (item.id === task.id ? { ...item, scheduled_for: previousScheduledFor } : item)));
      setError(task.id, toEnglishError(result.error));
      setPending(task.id, false);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === task.id ? result.data : item)));
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

    setItems((prev) => prev.map((item) => (item.id === task.id ? result.data : item)));
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

    const trimmedTitle = draftTitle.trim();
    const normalizedProjectId = draftProjectId.trim() !== "" ? draftProjectId : null;
    const isDirtyNonPomodoro = trimmedTitle !== task.title || normalizedProjectId !== (task.project_id ?? null);

    if (isDirtyNonPomodoro) return;

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

    setItems((prev) => prev.map((item) => (item.id === task.id ? result.data : item)));
    setPending(task.id, false);
    router.refresh();
  }

  async function handleSave(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const trimmedTitle = draftTitle.trim();
    const normalizedProjectId = draftProjectId.trim() !== "" ? draftProjectId : null;

    if (!trimmedTitle) {
      setError(task.id, "Title is required.");
      return;
    }

    setPending(task.id, true);
    setError(task.id, null);
    let updated = task;

    const titleChanged = trimmedTitle !== task.title;
    const projectChanged = normalizedProjectId !== (task.project_id ?? null);
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
      currentOverrides.workMinutes !== nextOverrides.workMinutes
      || currentOverrides.shortBreakMinutes !== nextOverrides.shortBreakMinutes
      || currentOverrides.longBreakMinutes !== nextOverrides.longBreakMinutes
      || currentOverrides.longBreakEvery !== nextOverrides.longBreakEvery;

    if (titleChanged) {
      const result = await updateTaskTitle(task.id, trimmedTitle);
      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }
      updated = result.data;
    }

    if (projectChanged) {
      const result = await updateTaskProject(task.id, normalizedProjectId);
      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }
      updated = result.data;
    }

    if (overridesChanged) {
      const result = await updateTaskPomodoroOverrides(task.id, useCustomPomodoro ? nextOverrides : null);
      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }
      updated = result.data;
    }

    setItems((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    cancelEditing();
    setPending(task.id, false);
    router.refresh();
  }

  async function handleDelete(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    setPending(task.id, true);
    setError(task.id, null);

    const result = await deleteTask(task.id);

    if (!result.success) {
      setError(task.id, toEnglishError(result.error));
    } else {
      setItems((prev) => prev.map((item) => (item.id === task.id ? result.data : item)));
      if (editingId === task.id) cancelEditing();
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
      setItems((prev) => prev.map((item) => (item.id === task.id ? result.data : item)));
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

  const projectLabelById = React.useMemo(() => {
    const entries = (projects ?? []).map((project) => [project.id, project.name] as const);
    return new Map(entries);
  }, [projects]);

  const visibleItems = items;
  const queueIds = new Set(queue.map((item) => item.task_id));
  const queueIsFull = queue.length >= MAX_QUEUE_ITEMS;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-muted/20 p-4" data-testid="today-queue">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Today Queue</h2>
            <Badge variant="warning">{queue.length}/{MAX_QUEUE_ITEMS}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" type="button" variant="secondary" onClick={() => setQueueOpen((v) => !v)}>
              {queueOpen ? "Collapse" : "Expand"}
            </Button>
            <Button size="sm" type="button" variant="secondary" onClick={handleQueueRefresh}>Refresh</Button>
          </div>
        </div>
        {queueError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queueError}</p> : null}

        {queueOpen ? (
          queue.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              Queue is empty. Add tasks below to prioritize your day.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {queue.map((item, index) => {
                const isPending = Boolean(queuePendingIds[item.task_id]);
                return (
                  <li key={item.task_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {index + 1}. {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">Task queue order</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        disabled={index === 0 || isPending}
                        onClick={() => handleQueueMoveUp(item.task_id)}
                        data-testid={`queue-move-up-${item.task_id}`}
                      >
                        Up
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        disabled={index === queue.length - 1 || isPending}
                        onClick={() => handleQueueMoveDown(item.task_id)}
                        data-testid={`queue-move-down-${item.task_id}`}
                      >
                        Down
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        type="button"
                        disabled={isPending}
                        onClick={() => handleQueueRemove(item.task_id)}
                        data-testid={`queue-remove-${item.task_id}`}
                      >
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Your Tasks</h2>
          <p className="text-xs text-muted-foreground">{visibleItems.filter((t) => t.completed).length}/{visibleItems.length} completed</p>
        </div>

        <ul className="space-y-2">
          {visibleItems.map((task) => {
            const isEditing = editingId === task.id;
            const isPending = Boolean(pendingIds[task.id]);
            const errorMessage = errorsById[task.id];
            const projectLabel = task.project_id ? projectLabelById.get(task.project_id) ?? "Project archived" : null;
            const stats = pomodoroStatsByTaskId[task.id];
            const isArchived = task.archived_at != null;

            return (
              <li
                key={task.id}
                className={[
                  "rounded-xl border border-border bg-card px-4 py-3 transition-all",
                  isArchived ? "border-dashed opacity-80" : "hover:border-emerald-200 hover:shadow-sm",
                ].join(" ")}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggle(task)}
                        disabled={isPending || isEditing || isArchived}
                        aria-label={`Mark ${task.title} as completed`}
                        className="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus-ring"
                      />
                      <div className="min-w-0">
                        <p className={[
                          "truncate text-sm font-semibold",
                          task.completed ? "text-muted-foreground line-through" : "text-foreground",
                        ].join(" ")}>{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {projectLabel ? <Badge variant="neutral">{projectLabel}</Badge> : null}
                          {task.scheduled_for ? <Badge variant="neutral">Due {task.scheduled_for}</Badge> : null}
                          {isArchived ? <Badge variant="neutral">Archived</Badge> : null}
                          {stats ? <Badge variant="neutral">Pomodoro {stats.pomodoros_today}/{stats.pomodoros_total}</Badge> : null}
                        </div>
                      </div>
                    </div>

                    {!isArchived ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`task-scheduled-for-${task.id}`}>Scheduled date for {task.title}</label>
                        <input
                          id={`task-scheduled-for-${task.id}`}
                          type="date"
                          value={task.scheduled_for ?? ""}
                          disabled={isPending || isEditing}
                          onChange={(event) => {
                            const value = event.target.value;
                            void handleSetScheduledFor(task, value === "" ? null : value);
                          }}
                          className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-ring"
                          data-testid={`task-scheduled-for-${task.id}`}
                        />
                        {canSetToFilterDate ? (
                          <Button
                            size="sm"
                            type="button"
                            variant="secondary"
                            disabled={isPending || isEditing || task.scheduled_for === currentDate}
                            onClick={() => void handleSetScheduledFor(task, currentDate)}
                            data-testid={`task-scheduled-filter-date-${task.id}`}
                          >
                            Set to filter date
                          </Button>
                        ) : null}
                        <Button size="sm" type="button" variant="secondary" disabled={isPending || isEditing} onClick={() => void handleSetScheduledFor(task, todayYYYYMMDD())} data-testid={`task-scheduled-today-${task.id}`}>Today</Button>
                        <Button size="sm" type="button" variant="secondary" disabled={isPending || isEditing || !task.scheduled_for} onClick={() => void handleSetScheduledFor(task, null)} data-testid={`task-scheduled-clear-${task.id}`}>Clear</Button>
                      </div>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {isArchived ? (
                        <Button size="sm" type="button" variant="secondary" onClick={() => handleRestore(task)} disabled={isPending} data-testid="task-restore">Restore</Button>
                      ) : (
                        <>
                          <Button size="sm" type="button" variant="secondary" onClick={() => handleQueueAdd(task)} disabled={queueIds.has(task.id) || queueIsFull || isPending} data-testid={`queue-add-${task.id}`}>
                            Add queue
                          </Button>
                          <Tooltip label="Edit task details">
                            <IconButton type="button" onClick={() => startEditing(task)} disabled={isPending} aria-label="Edit task">
                              <IconPencil className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip label="Archive this task">
                            <IconButton type="button" variant="danger" onClick={() => handleDelete(task)} disabled={isPending} aria-label="Delete task">
                              <IconTrash className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={500} disabled={isPending} aria-label="Edit task title" />
                      <Select value={draftProjectId} onChange={(event) => setDraftProjectId(event.target.value)} disabled={isPending}>
                        <option value="">No project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={useCustomPomodoro} onChange={(event) => setUseCustomPomodoro(event.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-border text-emerald-600" data-testid="task-pomodoro-toggle" />
                        Use custom Pomodoro
                      </label>
                      <div role="group" aria-label="Pomodoro presets" className="flex flex-wrap gap-2">
                        {pomodoroPresets.map((preset) => (
                          <Button key={preset.id} size="sm" type="button" variant="secondary" onClick={() => handleApplyPomodoroPreset(task, preset)} disabled={isPending} aria-label={`Apply ${preset.label} preset`}>
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      {useCustomPomodoro ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input type="number" min={1} max={240} step={1} value={draftPomodoroWork} onChange={(event) => setDraftPomodoroWork(event.target.value)} disabled={isPending} placeholder="Work minutes" data-testid="task-pomodoro-work" />
                          <Input type="number" min={1} max={60} step={1} value={draftPomodoroShort} onChange={(event) => setDraftPomodoroShort(event.target.value)} disabled={isPending} placeholder="Short break" data-testid="task-pomodoro-short" />
                          <Input type="number" min={1} max={120} step={1} value={draftPomodoroLong} onChange={(event) => setDraftPomodoroLong(event.target.value)} disabled={isPending} placeholder="Long break" data-testid="task-pomodoro-long" />
                          <Input type="number" min={1} max={12} step={1} value={draftPomodoroEvery} onChange={(event) => setDraftPomodoroEvery(event.target.value)} disabled={isPending} placeholder="Long break every" data-testid="task-pomodoro-every" />
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {useCustomPomodoro ? <Button size="sm" type="button" variant="secondary" onClick={() => handleResetPomodoro(task)} disabled={isPending} data-testid="task-pomodoro-reset">Reset defaults</Button> : null}
                        <Button size="sm" type="button" onClick={() => handleSave(task)} disabled={isPending}>Save</Button>
                        <Button size="sm" type="button" variant="secondary" onClick={cancelEditing} disabled={isPending}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {errorMessage ? <p className="mt-2 text-sm text-red-600" role="alert">{toEnglishError(errorMessage)}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

