//file: app/(app)/tasks/components/TaskList.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteTask,
  toggleTaskCompletion,
  updateTaskTitle,
  updateTaskProject,
  TaskRow,
} from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

type TaskListProps = {
  tasks: TaskRow[];
  projects?: { id: string; name: string }[];
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
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

export function TaskList({ tasks, projects = [] }: TaskListProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<TaskRow[]>(tasks);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftProjectId, setDraftProjectId] = React.useState("");
  const [pendingIds, setPendingIds] = React.useState<Record<string, boolean>>({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>(
    {},
  );
  const [projectFilter, setProjectFilter] = React.useState<string>("all");

  const projectIds = React.useMemo(() => {
    return new Set(projects.map((project) => project.id));
  }, [projects]);

  React.useEffect(() => {
    setItems(tasks);
  }, [tasks]);

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

  function startEditing(task: TaskRow) {
    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftProjectId(task.project_id ?? "");
    setError(task.id, null);
  }

  function cancelEditing() {
    if (editingId) {
      setError(editingId, null);
    }
    setEditingId(null);
    setDraftTitle("");
    setDraftProjectId("");
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
      setItems((prev) => prev.filter((item) => item.id !== task.id));
      if (editingId === task.id) cancelEditing();
      router.refresh();
    }

    setPending(task.id, false);
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

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your tasks
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filter by project
        </label>
        <select
          data-testid="projects-filter"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
        >
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {filteredItems.map((task) => {
          const isEditing = editingId === task.id;
          const isPending = Boolean(pendingIds[task.id]);
          const errorMessage = errorsById[task.id];
          const projectLabel = task.project_id
            ? projectLabelById.get(task.project_id) ?? "Project archived"
            : null;

          return (
            <li key={task.id} className="px-4 py-3 hover:bg-muted">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                    disabled={isPending || isEditing}
                    aria-label={`Mark ${task.title} as completed`}
                  />
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "text-sm",
                          task.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {task.title}
                      </span>
                      {projectLabel ? <Badge variant="neutral">{projectLabel}</Badge> : null}
                    </div>
                  )}
                </div>
                {!isEditing ? (
                  <div className="flex items-center gap-2">
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
