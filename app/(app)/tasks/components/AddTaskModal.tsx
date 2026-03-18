"use client";

import * as React from "react";

import { Dialog } from "@/components/ui/dialog";
import type { TaskPresentationMeta } from "@/lib/tasks/types";
import type { TaskRow } from "@/app/actions/tasks";
import { CreateTaskForm } from "./CreateTaskForm";

type ProjectOption = {
  id: string;
  name: string;
};

type AddTaskModalProps = {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
  onCreated?: (task: TaskRow, meta: TaskPresentationMeta) => void;
};

export function AddTaskModal({
  open,
  onClose,
  projects,
  defaultScheduledFor = null,
  defaultProjectId = null,
  onCreated,
}: AddTaskModalProps) {
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setIsDirty(false);
      setIsSubmitting(false);
    }
  }, [open]);

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty && !window.confirm("Discard this task draft?")) return;
    onClose();
  }

  return (
    <Dialog
      title="Add task"
      open={open}
      onClose={requestClose}
      descriptionId="add-task-modal-description"
      panelClassName="sm:max-w-[700px]"
    >
      <div className="border-b-[0.5px] border-border px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-card-title text-foreground">Add task</h2>
            <p className="text-sm text-muted-foreground">
              Keep it lightweight. You can refine details after capture.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="focus-ring ui-hover inline-flex h-9 w-9 items-center justify-center rounded-md border-[0.5px] border-border text-muted-foreground hover:bg-muted"
            aria-label="Close add task modal"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <CreateTaskForm
        projects={projects}
        defaultScheduledFor={defaultScheduledFor}
        defaultProjectId={defaultProjectId}
        autoFocusTitle
        onCancel={requestClose}
        onSuccess={onClose}
        onCreated={onCreated}
        onDirtyChange={setIsDirty}
        onSubmittingChange={setIsSubmitting}
      />
    </Dialog>
  );
}
