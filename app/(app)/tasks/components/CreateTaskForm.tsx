"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERROR_MAP: Record<string, string> = {
  "Le titre est requis.": "Title is required.",
  "Le titre est trop long.": "Title is too long.",
  "Titre invalide.": "Invalid title.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de creer la tache. Reessaie.": "Unable to create task. Try again.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

export function CreateTaskForm() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const trimmedTitle = title.trim();
  const isDisabled = isPending || trimmedTitle.length === 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    setError(null);

    startTransition(async () => {
      const result = await createTask(trimmedTitle);

      if (!result.success) {
        setError(toEnglishError(result.error));
        return;
      }

      setTitle("");
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">Create a task</h2>
        <p className="text-sm text-zinc-500">
          Keep tasks short and actionable to stay focused.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="task-title">
          Task title
        </label>
        <Input
          id="task-title"
          name="title"
          placeholder="e.g. Plan the product review"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "task-title-error" : undefined}
        />
      </div>

      {error ? (
        <p
          id="task-title-error"
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isDisabled} className="w-full">
        {isPending ? "Creating..." : "Add task"}
      </Button>
      <p className="text-xs text-zinc-500">
        Your task will appear in the list instantly.
      </p>
    </form>
  );
}
