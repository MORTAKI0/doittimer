"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createTask, type TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTaskPresentationMeta } from "@/lib/tasks/presentation";
import type { TaskPresentationMeta } from "@/lib/tasks/types";
import { DEFAULT_TASK_PRIORITY } from "@/lib/tasks/types";
import { DatePickerPopover } from "./DatePickerPopover";
import { PriorityPicker } from "./PriorityPicker";

type ProjectOption = {
  id: string;
  name: string;
};

type InlineTaskComposerProps = {
  projects: ProjectOption[];
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
  autoOpenFromQuery?: boolean;
  onCreated?: (task: TaskRow, meta: TaskPresentationMeta) => void;
};

const MAX_PANEL_HEIGHT = 320;

export function InlineTaskComposer({
  projects,
  defaultScheduledFor = null,
  defaultProjectId = null,
  autoOpenFromQuery = false,
  onCreated,
}: InlineTaskComposerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState(DEFAULT_TASK_PRIORITY);
  const [scheduledFor, setScheduledFor] = React.useState<string | null>(defaultScheduledFor);
  const [projectId, setProjectId] = React.useState<string | null>(defaultProjectId);
  const [submitting, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const titleRef = React.useRef<HTMLInputElement | null>(null);
  const autoOpenHandledRef = React.useRef(false);

  React.useEffect(() => {
    setScheduledFor(defaultScheduledFor);
  }, [defaultScheduledFor]);

  React.useEffect(() => {
    setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  React.useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
    setError(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!autoOpenFromQuery || autoOpenHandledRef.current) return;
    autoOpenHandledRef.current = true;
    setOpen(true);

    const params = new URLSearchParams(searchParamsKey);
    params.delete("compose");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [autoOpenFromQuery, pathname, router, searchParamsKey]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority(DEFAULT_TASK_PRIORITY);
    setScheduledFor(defaultScheduledFor);
    setProjectId(defaultProjectId);
    setError(null);
    setOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createTask(title.trim(), projectId ?? null, scheduledFor);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const meta: TaskPresentationMeta = {
        priority,
        description: description.trim(),
        sectionName: null,
      };

      saveTaskPresentationMeta(result.data.id, meta);
      onCreated?.(result.data, meta);
      reset();
    });
  }

  return (
    <div className="border-t-[0.5px] border-border pt-1">
      <button
        type="button"
        className="nav-action-link focus-ring min-h-0 px-0 py-2"
        onClick={() => setOpen(true)}
      >
        <span className="nav-action-icon text-base leading-none text-current" aria-hidden="true">
          +
        </span>
        <span>Add task</span>
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
        style={{ maxHeight: open ? MAX_PANEL_HEIGHT : 0, opacity: open ? 1 : 0 }}
      >
        {open ? (
          <form className="animate-scaleIn mt-2 rounded-md border-[0.5px] border-border bg-card p-3" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task name"
                aria-label="Task name"
                disabled={submitting}
              />
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description"
                aria-label="Description"
                disabled={submitting}
              />

              <div className="flex flex-wrap gap-2">
                <DatePickerPopover value={scheduledFor} onSelect={setScheduledFor} />
                <PriorityPicker value={priority} onSelect={setPriority} />
                <label className="focus-ring ui-hover inline-flex h-9 items-center rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground">
                  <span className="mr-2" aria-hidden="true">📁</span>
                  <select
                    value={projectId ?? ""}
                    onChange={(event) => setProjectId(event.target.value || null)}
                    className="bg-transparent outline-none"
                    disabled={submitting}
                    aria-label="Project"
                  >
                    <option value="">Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="h-9 rounded-md border-[0.5px] border-border px-3 text-sm text-muted-foreground"
                  disabled
                >
                  …
                </button>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={reset} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !title.trim()}>
                  {submitting ? "Adding..." : "Add task"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
