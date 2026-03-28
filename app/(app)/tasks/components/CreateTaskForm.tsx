"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTask, type TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerPopover } from "./DatePickerPopover";

const ERROR_MAP: Record<string, string> = {
  "Le titre est requis.": "Title is required.",
  "Le titre est trop long.": "Title is too long.",
  "Titre invalide.": "Invalid title.",
  "Identifiant invalide.": "Invalid identifier.",
  "Date invalide. Format attendu: YYYY-MM-DD.": "Invalid date format. Use YYYY-MM-DD.",
  "Date invalide.": "Invalid date.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de creer la tache. Reessaie.": "Unable to create task. Try again.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

type ProjectOption = {
  id: string;
  name: string;
};

type CreateTaskFormProps = {
  projects?: ProjectOption[];
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
  autoFocusTitle?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  onCreated?: (task: TaskRow) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmittingChange?: (submitting: boolean) => void;
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function hasDirtyState(
  fields: {
  title: string;
  scheduledFor: string | null;
  projectId: string | null;
},
  defaults: {
    scheduledFor: string | null;
    projectId: string | null;
  },
) {
  return (
    fields.title.trim().length > 0
    || fields.scheduledFor !== defaults.scheduledFor
    || fields.projectId !== defaults.projectId
  );
}

export function CreateTaskForm({
  projects = [],
  defaultScheduledFor = null,
  defaultProjectId = null,
  autoFocusTitle = false,
  onCancel,
  onSuccess,
  onCreated,
  onDirtyChange,
  onSubmittingChange,
}: CreateTaskFormProps) {
  const router = useRouter();
  const titleRef = React.useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = React.useState("");
  const [scheduledFor, setScheduledFor] = React.useState<string | null>(defaultScheduledFor);
  const [projectId, setProjectId] = React.useState<string | null>(defaultProjectId);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setScheduledFor(defaultScheduledFor);
  }, [defaultScheduledFor]);

  React.useEffect(() => {
    setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  React.useEffect(() => {
    onSubmittingChange?.(isPending);
  }, [isPending, onSubmittingChange]);

  React.useEffect(() => {
    onDirtyChange?.(
      hasDirtyState({
        title,
        scheduledFor,
        projectId,
      }, {
        scheduledFor: defaultScheduledFor,
        projectId: defaultProjectId,
      }),
    );
  }, [defaultProjectId, defaultScheduledFor, onDirtyChange, projectId, scheduledFor, title]);

  React.useEffect(() => {
    if (!error) return;
    titleRef.current?.focus();
  }, [error]);

  function reset() {
    setTitle("");
    setScheduledFor(defaultScheduledFor);
    setProjectId(defaultProjectId);
    setError(null);
  }

  function handleCancel() {
    reset();
    onCancel?.();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createTask(trimmedTitle, projectId, scheduledFor);
      if (!result.success) {
        setError(toEnglishError(result.error));
        return;
      }

      onCreated?.(result.data);
      reset();
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="sr-only" htmlFor="task-title">
              Task title
            </label>
            <Input
              ref={titleRef}
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task name"
              aria-label="Task name"
              autoComplete="off"
              autoFocus={autoFocusTitle}
              maxLength={500}
              disabled={isPending}
              className="h-12 border-transparent bg-transparent px-0 text-[1.08rem] font-medium shadow-none placeholder:text-muted-foreground focus:scale-[1.001]"
            />
            <p id="add-task-modal-description" className="text-sm text-muted-foreground">
              Capture the task first. Add details only if they help you act on it faster.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DatePickerPopover value={scheduledFor} onSelect={setScheduledFor} />
            <button
              type="button"
              className="focus-ring ui-hover inline-flex h-9 items-center gap-2 rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-muted-foreground"
              disabled
              aria-disabled="true"
            >
              <span aria-hidden="true">📎</span>
              <span>Attachment</span>
            </button>
            <button
              type="button"
              className="focus-ring ui-hover inline-flex h-9 items-center gap-2 rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-muted-foreground"
              disabled
              aria-disabled="true"
            >
              <span aria-hidden="true">⏰</span>
              <span>Reminder</span>
            </button>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-label" htmlFor="task-project">
              Project
            </label>
            <label className="focus-ring ui-hover inline-flex h-10 items-center gap-2 rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground">
              <span aria-hidden="true">📁</span>
              <select
                id="task-project"
                value={projectId ?? ""}
                onChange={(event) => setProjectId(event.target.value || null)}
                className="w-full bg-transparent outline-none"
                disabled={isPending}
                aria-label="Project"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t-[0.5px] border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isPending}
            loadingLabel="Adding..."
            disabled={!title.trim()}
          >
            Add task
          </Button>
        </div>
      </div>
    </form>
  );
}
