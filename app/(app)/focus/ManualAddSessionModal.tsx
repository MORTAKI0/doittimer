"use client";

import * as React from "react";

import type { TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDefaultManualSessionRange } from "./sessionDateTime";

type ManualAddSessionValues = {
  startedAt: string;
  endedAt: string;
  taskId: string | null;
};

type ManualAddSessionModalProps = {
  open: boolean;
  tasks: TaskRow[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ManualAddSessionValues) => Promise<void>;
  onValidationError: (message: string) => void;
};

export function ManualAddSessionModal({
  open,
  tasks,
  isSubmitting,
  error,
  onClose,
  onSubmit,
  onValidationError,
}: ManualAddSessionModalProps) {
  const [startedAt, setStartedAt] = React.useState("");
  const [endedAt, setEndedAt] = React.useState("");
  const [taskId, setTaskId] = React.useState<string>("");
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const defaults = getDefaultManualSessionRange();
    setStartedAt(defaults.startedAt);
    setEndedAt(defaults.endedAt);
    setTaskId("");
    setLocalError(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (!isSubmitting) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close add session modal"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div className="border-border bg-card relative z-[101] w-full max-w-xl rounded-2xl border p-5 shadow-[var(--shadow-lift)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-section-title">Add session</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const startedDate = new Date(startedAt);
            const endedDate = new Date(endedAt);

            if (
              Number.isNaN(startedDate.getTime()) ||
              Number.isNaN(endedDate.getTime())
            ) {
              const message = "Invalid date value.";
              setLocalError(message);
              onValidationError(message);
              return;
            }

            const diffMs = endedDate.getTime() - startedDate.getTime();

            if (diffMs < 0) {
              const message = "End time must be after start time.";
              setLocalError(message);
              onValidationError(message);
              return;
            }

            if (diffMs > 12 * 60 * 60 * 1000) {
              const message = "Session duration cannot exceed 12 hours.";
              setLocalError(message);
              onValidationError(message);
              return;
            }

            setLocalError(null);
            void onSubmit({
              startedAt,
              endedAt,
              taskId: taskId.length > 0 ? taskId : null,
            });
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="session-manual-start"
              className="text-foreground text-sm font-medium"
            >
              Started at
            </label>
            <Input
              id="session-manual-start"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => {
                setStartedAt(event.target.value);
                if (localError) setLocalError(null);
              }}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-manual-end"
              className="text-foreground text-sm font-medium"
            >
              Ended at
            </label>
            <Input
              id="session-manual-end"
              type="datetime-local"
              value={endedAt}
              onChange={(event) => {
                setEndedAt(event.target.value);
                if (localError) setLocalError(null);
              }}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-manual-task"
              className="text-foreground text-sm font-medium"
            >
              Task (optional)
            </label>
            <Select
              id="session-manual-task"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">No task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </div>

          {localError || error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {localError ?? error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Saving..."
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
