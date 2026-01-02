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
import { Input } from "@/components/ui/input";

type TaskListProps = {
  tasks: TaskRow[];
};

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
      setError(task.id, result.error);
    } else {
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleSave(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      setError(task.id, "Le titre est requis.");
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
      setError(task.id, result.error);
    } else {
      cancelEditing();
      router.refresh();
    }

    setPending(task.id, false);
  }

  async function handleDelete(task: TaskRow) {
    if (pendingIds[task.id]) return;
    const confirmed = window.confirm("Supprimer cette tache ?");
    if (!confirmed) return;

    setPending(task.id, true);
    setError(task.id, null);

    const result = await deleteTask(task.id);

    if (!result.success) {
      setError(task.id, result.error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== task.id));
      if (editingId === task.id) cancelEditing();
      router.refresh();
    }

    setPending(task.id, false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Mes taches
      </h2>
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {items.map((task) => {
          const isEditing = editingId === task.id;
          const isPending = Boolean(pendingIds[task.id]);
          const errorMessage = errorsById[task.id];

          return (
            <li key={task.id} className="px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-black focus-visible:ring-2 focus-visible:ring-black/20"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                    disabled={isPending || isEditing}
                    aria-label={`Marquer ${task.title} comme terminee`}
                  />
                  {isEditing ? (
                    <div className="w-full space-y-2">
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        maxLength={500}
                        disabled={isPending}
                        aria-label="Modifier le titre"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleSave(task)}
                          disabled={isPending}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={cancelEditing}
                          disabled={isPending}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={[
                        "text-sm",
                        task.completed ? "text-zinc-400 line-through" : "text-zinc-900",
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
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => startEditing(task)}
                      disabled={isPending}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(task)}
                      disabled={isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : null}
              </div>
              {errorMessage ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
