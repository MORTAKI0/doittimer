//file: app/(app)/tasks/components/TaskList.tsx
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
  toggleTaskCompletion,
  updateTaskTitle,
  updateTaskProject,
  updateTaskPomodoroOverrides,
  TaskPomodoroOverrides,
  TaskRow,
} from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  pomodoroPresets,
  presetToOverrides,
  type PomodoroPreset,
} from "@/lib/pomodoro/presets";

type TaskListProps = {
  tasks: TaskRow[];
  projects?: { id: string; name: string }[];
  pomodoroStatsByTaskId?: Record<
    string,
    { pomodoros_today: number; pomodoros_total: number }
  >;
  queueItems?: TaskQueueRow[];
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

export function TaskList({
  tasks,
  projects = [],
  pomodoroStatsByTaskId = {},
  queueItems = [],
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
  const [queuePendingIds, setQueuePendingIds] = React.useState<Record<string, boolean>>(
    {},
  );
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>(
    {},
  );
  const [queueError, setQueueError] = React.useState<string | null>(null);
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [showArchived, setShowArchived] = React.useState(false);

  const MAX_QUEUE_ITEMS = 7;

  const projectIds = React.useMemo(() => {
    return new Set(projects.map((project) => project.id));
  }, [projects]);

  React.useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  React.useEffect(() => {
    setQueue(queueItems);
  }, [queueItems]);

  React.useEffect(() => {
    if (projectFilter === "all" || projectFilter === "none") return;
    if (projectFilter && !projectIds.has(projectFilter)) {
      setProjectFilter("all");
    }
  }, [projectFilter, projectIds]);

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
    setDraftPomodoroWork(
      typeof task.pomodoro_work_minutes === "number" ? String(task.pomodoro_work_minutes) : "",
    );
    setDraftPomodoroShort(
      typeof task.pomodoro_short_break_minutes === "number"
        ? String(task.pomodoro_short_break_minutes)
        : "",
    );
    setDraftPomodoroLong(
      typeof task.pomodoro_long_break_minutes === "number"
        ? String(task.pomodoro_long_break_minutes)
        : "",
    );
    setDraftPomodoroEvery(
      typeof task.pomodoro_long_break_every === "number"
        ? String(task.pomodoro_long_break_every)
        : "",
    );
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
    setItems((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, completed: nextCompleted } : item,
      ),
    );

    const result = await toggleTaskCompletion(task.id, nextCompleted);

    if (!result.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, completed: previousCompleted } : item,
        ),
      );
      setError(task.id, toEnglishError(result.error));
    } else {
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

    setItems((prev) =>
      prev.map((item) => (item.id === task.id ? result.data : item)),
    );
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
    const isDirtyNonPomodoro =
      trimmedTitle !== task.title
      || normalizedProjectId !== (task.project_id ?? null);

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

    setItems((prev) =>
      prev.map((item) => (item.id === task.id ? result.data : item)),
    );
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
      : {
        workMinutes: null,
        shortBreakMinutes: null,
        longBreakMinutes: null,
        longBreakEvery: null,
      };
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
      const result = await updateTaskPomodoroOverrides(
        task.id,
        useCustomPomodoro ? nextOverrides : null,
      );

      if (!result.success) {
        setError(task.id, toEnglishError(result.error));
        setPending(task.id, false);
        return;
      }

      updated = result.data;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === task.id ? updated : item)),
    );
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
      setItems((prev) =>
        prev.map((item) => (item.id === task.id ? result.data : item)),
      );
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
      setItems((prev) =>
        prev.map((item) => (item.id === task.id ? result.data : item)),
      );
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

  const filteredItems = items.filter((task) => {
    if (projectFilter === "all") return true;
    if (projectFilter === "none") return task.project_id == null;
    return task.project_id === projectFilter;
  });

  const visibleItems = filteredItems.filter((task) =>
    showArchived ? true : task.archived_at == null,
  );
  const hasArchived = items.some((task) => task.archived_at != null);
  const queueIds = new Set(queue.map((item) => item.task_id));
  const queueIsFull = queue.length >= MAX_QUEUE_ITEMS;

  return (
    <div className="space-y-6">
      {/* Today Queue Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Today Queue
            </h2>
            {queue.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {queue.length}/{MAX_QUEUE_ITEMS}
              </span>
            )}
          </div>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={handleQueueRefresh}
            className="gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
        {queueError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {queueError}
          </p>
        ) : null}
        <div data-testid="today-queue">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-6 text-center">
              <div className="rounded-full bg-amber-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">No tasks in queue</p>
              <p className="text-xs text-muted-foreground">Add tasks from the list below to prioritize your day</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === queue.length - 1;
                const isPending = Boolean(queuePendingIds[item.task_id]);
                const positionNumber = index + 1;
                return (
                  <li
                    key={item.task_id}
                    className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-amber-50/30 to-transparent px-4 py-3 transition-all duration-200 hover:border-amber-200 hover:shadow-sm"
                  >
                    {/* Position Badge */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow-sm">
                      {positionNumber}
                    </div>
                    <div className="flex flex-1 items-center gap-2 text-sm font-medium text-foreground">
                      <span>{item.title}</span>
                      {item.archived_at ? (
                        <Badge variant="neutral">Archived</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => handleQueueMoveUp(item.task_id)}
                        disabled={isFirst || isPending}
                        aria-label="Move up"
                        data-testid={`queue-move-up-${item.task_id}`}
                        className="h-8 w-8 p-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => handleQueueMoveDown(item.task_id)}
                        disabled={isLast || isPending}
                        aria-label="Move down"
                        data-testid={`queue-move-down-${item.task_id}`}
                        className="h-8 w-8 p-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => handleQueueRemove(item.task_id)}
                        disabled={isPending}
                        aria-label="Remove from queue"
                        data-testid={`queue-remove-${item.task_id}`}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
      </div>
      {/* Your Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Your Tasks
          </h2>
          {visibleItems.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {visibleItems.filter(t => t.completed).length}/{visibleItems.length} done
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filter by project
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select
              data-testid="projects-filter"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 pr-8 text-sm text-foreground transition-all duration-200 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
            >
              <option value="all">All projects</option>
              <option value="none">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {hasArchived ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  data-testid="tasks-archived-toggle"
                />
                Show archived
              </label>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {visibleItems.map((task) => {
          const isEditing = editingId === task.id;
          const isPending = Boolean(pendingIds[task.id]);
          const errorMessage = errorsById[task.id];
          const projectLabel = task.project_id
            ? projectLabelById.get(task.project_id) ?? "Project archived"
            : null;
          const isArchived = task.archived_at != null;
          const pomodoroStats = pomodoroStatsByTaskId[task.id] ?? {
            pomodoros_today: 0,
            pomodoros_total: 0,
          };

          return (
            <li
              key={task.id}
              className={[
                "group rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200",
                isArchived ? "opacity-60" : "hover:border-emerald-200 hover:shadow-sm",
              ].filter(Boolean).join(" ")}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  {/* Custom styled checkbox */}
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-border bg-background transition-all checked:border-emerald-500 checked:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      checked={task.completed}
                      onChange={() => handleToggle(task)}
                      disabled={isPending || isEditing || isArchived}
                      aria-label={`Mark ${task.title} as completed`}
                    />
                    <svg
                      className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {isEditing ? (
                    <div className="w-full space-y-2">
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        maxLength={500}
                        disabled={isPending}
                        aria-label="Edit task title"
                      />
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Project
                        </label>
                        <select
                          value={draftProjectId}
                          onChange={(event) => setDraftProjectId(event.target.value)}
                          disabled={isPending}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                        >
                          <option value="">No project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Pomodoro
                          </p>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={useCustomPomodoro}
                              onChange={(event) => setUseCustomPomodoro(event.target.checked)}
                              disabled={isPending}
                              className="h-4 w-4 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                              data-testid="task-pomodoro-toggle"
                            />
                            Use custom Pomodoro
                          </label>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Presets
                          </p>
                          <div
                            role="group"
                            aria-label="Pomodoro presets"
                            className="flex flex-wrap gap-2"
                          >
                            {pomodoroPresets.map((preset) => (
                              <Button
                                key={preset.id}
                                size="sm"
                                type="button"
                                variant="secondary"
                                onClick={() => handleApplyPomodoroPreset(task, preset)}
                                disabled={isPending}
                                aria-label={`Apply ${preset.label} preset`}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        {useCustomPomodoro ? (
                          <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Work minutes
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={240}
                                  step={1}
                                  value={draftPomodoroWork}
                                  onChange={(event) => setDraftPomodoroWork(event.target.value)}
                                  disabled={isPending}
                                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                                  data-testid="task-pomodoro-work"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Short break
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  step={1}
                                  value={draftPomodoroShort}
                                  onChange={(event) => setDraftPomodoroShort(event.target.value)}
                                  disabled={isPending}
                                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                                  data-testid="task-pomodoro-short"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Long break
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={120}
                                  step={1}
                                  value={draftPomodoroLong}
                                  onChange={(event) => setDraftPomodoroLong(event.target.value)}
                                  disabled={isPending}
                                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                                  data-testid="task-pomodoro-long"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Long break every
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  step={1}
                                  value={draftPomodoroEvery}
                                  onChange={(event) => setDraftPomodoroEvery(event.target.value)}
                                  disabled={isPending}
                                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                                  data-testid="task-pomodoro-every"
                                />
                              </label>
                            </div>
                            <Button
                              size="sm"
                              type="button"
                              variant="secondary"
                              onClick={() => handleResetPomodoro(task)}
                              disabled={isPending}
                              data-testid="task-pomodoro-reset"
                            >
                              Reset to defaults
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleSave(task)}
                          disabled={isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={cancelEditing}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "text-sm font-medium transition-all duration-200",
                            task.completed
                              ? "text-muted-foreground line-through decoration-emerald-400"
                              : "text-foreground",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {task.title}
                        </span>
                        {isArchived ? (
                          <Badge variant="neutral">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archived
                          </Badge>
                        ) : null}
                        {projectLabel ? (
                          <Badge variant="neutral">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {projectLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Today: {pomodoroStats.pomodoros_today}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Total: {pomodoroStats.pomodoros_total}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {!isEditing ? (
                  <div className="flex items-center gap-2">
                    {isArchived ? (
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => handleRestore(task)}
                        disabled={isPending}
                        data-testid="task-restore"
                      >
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => handleQueueAdd(task)}
                          disabled={queueIds.has(task.id) || queueIsFull || isPending}
                          aria-label="Add to Today queue"
                          data-testid={`queue-add-${task.id}`}
                        >
                          Add to queue
                        </Button>
                        <IconButton
                          type="button"
                          onClick={() => startEditing(task)}
                          disabled={isPending}
                          aria-label="Edit task"
                        >
                          <IconPencil className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          variant="danger"
                          onClick={() => handleDelete(task)}
                          disabled={isPending}
                          aria-label="Delete task"
                        >
                          <IconTrash className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              {errorMessage ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {toEnglishError(errorMessage)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
