//file: app/(app)/tasks/components/CreateTaskForm.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const ERROR_MAP: Record<string, string> = {
  "Le titre est requis.": "Title is required.",
  "Le titre est trop long.": "Title is too long.",
  "Titre invalide.": "Invalid title.",
  "Identifiant invalide.": "Invalid identifier.",
  "Date invalide. Format attendu: YYYY-MM-DD.": "Invalid date. Expected format: YYYY-MM-DD.",
  "Date invalide.": "Invalid date.",
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

type ScheduledForMode = "default" | "unscheduled" | "today" | "tomorrow";

function toYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayYYYYMMDD(): string {
  return toYYYYMMDD(new Date());
}

function tomorrowYYYYMMDD(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toYYYYMMDD(d);
}

type CreateTaskFormProps = {
  projects?: ProjectOption[];
  defaultScheduledFor?: string | null;
  schedulingHint?: string | null;
};

export function CreateTaskForm({
  projects = [],
  defaultScheduledFor = null,
  schedulingHint = null,
}: CreateTaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [scheduledForMode, setScheduledForMode] = React.useState<ScheduledForMode>("default");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const today = React.useMemo(() => todayYYYYMMDD(), []);
  const tomorrow = React.useMemo(() => tomorrowYYYYMMDD(), []);

  const trimmedTitle = title.trim();
  const isDisabled = isPending || trimmedTitle.length === 0;
  const scheduledForToSend = React.useMemo(() => {
    if (scheduledForMode === "default") return defaultScheduledFor ?? null;
    if (scheduledForMode === "unscheduled") return null;
    if (scheduledForMode === "today") return today;
    return tomorrow;
  }, [defaultScheduledFor, scheduledForMode, today, tomorrow]);
  const effectiveSchedulingHint = React.useMemo(() => {
    if (scheduledForMode === "default") return schedulingHint;
    if (scheduledForMode === "unscheduled") return "New tasks will be unscheduled";
    return `Will be scheduled for: ${scheduledForToSend}`;
  }, [scheduledForMode, schedulingHint, scheduledForToSend]);
  const showCreatedForDifferentDateNote =
    Boolean(defaultScheduledFor)
    && Boolean(scheduledForToSend)
    && scheduledForToSend !== defaultScheduledFor;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    setError(null);

    startTransition(async () => {
      const normalizedProjectId = projectId.trim() !== "" ? projectId : null;
      const result = await createTask(trimmedTitle, normalizedProjectId, scheduledForToSend);

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
        <Select
          id="task-project"
          name="project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          disabled={isPending || projects.length === 0}
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create a project to assign tasks.</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Schedule
        </label>
        <div className="flex flex-wrap gap-2">
          {defaultScheduledFor ? (
            <Button
              type="button"
              size="sm"
              variant={scheduledForMode === "default" ? "primary" : "secondary"}
              onClick={() => setScheduledForMode("default")}
              disabled={isPending}
            >
              Filter date
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={scheduledForMode === "unscheduled" ? "primary" : "secondary"}
            onClick={() => setScheduledForMode("unscheduled")}
            disabled={isPending}
          >
            Unscheduled
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scheduledForMode === "today" ? "primary" : "secondary"}
            onClick={() => setScheduledForMode("today")}
            disabled={isPending}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scheduledForMode === "tomorrow" ? "primary" : "secondary"}
            onClick={() => setScheduledForMode("tomorrow")}
            disabled={isPending}
          >
            Tomorrow
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Scheduled: {scheduledForToSend ?? "Unscheduled"}
        </p>
        {effectiveSchedulingHint ? (
          <p className="text-xs text-muted-foreground">
            {effectiveSchedulingHint}
          </p>
        ) : null}
        {showCreatedForDifferentDateNote ? (
          <p className="text-xs text-amber-700">
            This task may not appear in the current filter after create.
          </p>
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

      <Button type="submit" disabled={isDisabled} className="w-full">
        {isPending ? "Creating..." : "Add task"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your task will appear in the list instantly.
      </p>
    </form>
  );
}
