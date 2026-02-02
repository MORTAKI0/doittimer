//file: app/(app)/tasks/components/CreateTaskForm.tsx
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
  "Identifiant invalide.": "Invalid identifier.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de creer la tache. Reessaie.": "Unable to create task. Try again.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

type ProjectOption = {
  id: string;
  name: string;
};

type CreateTaskFormProps = {
  projects?: ProjectOption[];
};

export function CreateTaskForm({ projects = [] }: CreateTaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const trimmedTitle = title.trim();
  const isDisabled = isPending || trimmedTitle.length === 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    setError(null);

    startTransition(async () => {
      const normalizedProjectId = projectId.trim() !== "" ? projectId : null;
      const result = await createTask(trimmedTitle, normalizedProjectId);

      if (!result.success) {
        setError(toEnglishError(result.error));
        return;
      }

      setTitle("");
      setProjectId("");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="gradient-text text-lg font-semibold">Create a task</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Keep tasks short and actionable to stay focused.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="task-title">
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
          className="transition-all duration-200 focus:scale-[1.01]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="task-project">
          Project
        </label>
        <select
          id="task-project"
          name="project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-all duration-200 focus:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || projects.length === 0}
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create a project to assign tasks.</p>
        ) : null}
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

      <Button type="submit" disabled={isDisabled} className="btn-premium w-full">
        {isPending ? "Creating..." : "Add task"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your task will appear in the list instantly.
      </p>
    </form>
  );
}
