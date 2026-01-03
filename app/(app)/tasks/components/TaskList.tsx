"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  deleteTask,
  toggleTaskCompletion,
  updateTaskTitle,
  TaskRow,
} from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

type TaskListProps = {
  tasks: TaskRow[];
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

export function TaskList({ tasks }: TaskListProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<TaskRow[]>(tasks);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [pendingIds, setPendingIds] = React.useState<Record<string, boolean>>({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>(
    {},
  );

  React.useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  function setPending(id: string, value: boolean) {
    setPendingIds((prev) => ({ ...prev, [id]: value }));
  }

  function setError(id: string, message: string | null) {
    setErrorsById((prev) => ({ ...prev, [id]: message }));
  }

  function startEditing(task: TaskRow) {
    setEditingId(task.id);
    setDraftTitle(task.title);
    setError(task.id, null);
  }

  function cancelEditing() {
    if (editingId) {
      setError(editingId, null);
    }
    setEditingId(null);
    setDraftTitle("");
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

    if (!trimmedTitle) {
      setError(task.id, "Title is required.");
      return;
    }

    const previousTitle = task.title;
    setPending(task.id, true);
    setError(task.id, null);
    setItems((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, title: trimmedTitle } : item,
      ),
    );

    const result = await updateTaskTitle(task.id, trimmedTitle);

    if (!result.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, title: previousTitle } : item,
        ),
      );
      setError(task.id, toEnglishError(result.error));
    } else {
      cancelEditing();
      router.refresh();
    }

    setPending(task.id, false);
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

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your tasks
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((task) => {
          const isEditing = editingId === task.id;
          const isPending = Boolean(pendingIds[task.id]);
          const errorMessage = errorsById[task.id];

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
