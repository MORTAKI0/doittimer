"use client";

import * as React from "react";

import type { SessionRow } from "@/app/actions/sessions";
import type { TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type SessionEditValues = {
  startedAt: string;
  endedAt: string;
  taskId: string | null;
  editReason: string;
};

type SessionEditModalProps = {
  open: boolean;
  session: SessionRow | null;
  tasks: TaskRow[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: SessionEditValues) => Promise<void>;
};

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function SessionEditModal({
  open,
  session,
  tasks,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: SessionEditModalProps) {
  const [startedAt, setStartedAt] = React.useState("");
  const [endedAt, setEndedAt] = React.useState("");
  const [taskId, setTaskId] = React.useState<string>("");
  const [editReason, setEditReason] = React.useState("");

  React.useEffect(() => {
    if (!open || !session) return;
    setStartedAt(toLocalDateTimeValue(session.started_at));
    setEndedAt(toLocalDateTimeValue(session.ended_at));
    setTaskId(session.task_id ?? "");
    setEditReason(session.edit_reason ?? "");
  }, [open, session]);

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

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close edit session modal"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div className="border-border bg-card relative z-[101] w-full max-w-xl rounded-2xl border p-5 shadow-[var(--shadow-lift)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-section-title">Edit session</h2>
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
            void onSubmit({
              startedAt,
              endedAt,
              taskId: taskId.length > 0 ? taskId : null,
              editReason,
            });
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="session-edit-start"
              className="text-foreground text-sm font-medium"
            >
              Started at
            </label>
            <Input
              id="session-edit-start"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-edit-end"
              className="text-foreground text-sm font-medium"
            >
              Ended at
            </label>
            <Input
              id="session-edit-end"
              type="datetime-local"
              value={endedAt}
              onChange={(event) => setEndedAt(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-edit-task"
              className="text-foreground text-sm font-medium"
            >
              Task (optional)
            </label>
            <Select
              id="session-edit-task"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Keep current task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-edit-reason"
              className="text-foreground text-sm font-medium"
            >
              Edit reason (optional)
            </label>
            <textarea
              id="session-edit-reason"
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
              className="border-border bg-card text-foreground focus-ring w-full rounded-xl border px-3 py-2 text-sm shadow-[var(--shadow-inset)]"
              placeholder="Why was this session adjusted?"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
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
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
