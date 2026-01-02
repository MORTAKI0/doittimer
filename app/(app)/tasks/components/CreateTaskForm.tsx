"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        setError(result.error);
        return;
      }

      setTitle("");
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="task-title">
          Titre
        </label>
        <Input
          id="task-title"
          name="title"
          placeholder="Ex: Planifier la journee"
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
        {isPending ? "Creation..." : "Ajouter la tache"}
      </Button>
      <p className="text-xs text-zinc-500">
        La tache apparaitra automatiquement dans la liste.
      </p>
    </form>
  );
}
