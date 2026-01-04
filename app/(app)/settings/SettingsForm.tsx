// app/(app)/settings/SettingsForm.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getUserSettings, upsertUserSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";

type TaskOption = {
  id: string;
  title: string;
};

type SettingsFormProps = {
  initialTimezone: string;
  initialDefaultTaskId: string | null;
  tasks: TaskOption[];
};

const TIMEZONE_OPTIONS = [
  "Africa/Casablanca",
  "UTC",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Tokyo",
];

export function SettingsForm({
  initialTimezone,
  initialDefaultTaskId,
  tasks,
}: SettingsFormProps) {
  const router = useRouter();
  const [timezone, setTimezone] = React.useState(initialTimezone);
  const [defaultTaskId, setDefaultTaskId] = React.useState(initialDefaultTaskId ?? "");
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const normalizedDefaultTaskId =
        defaultTaskId.trim() !== "" ? defaultTaskId : null;

      try {
        await upsertUserSettings(timezone, normalizedDefaultTaskId);

        setIsError(false);
        setMessage("Settings saved.");
        router.refresh();
      } catch (error) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await getUserSettings();
          console.log("[settings] verification result", result);
          console.log("[settings] verification success", result.success);
          console.log("[settings] verification expected", {
            timezone,
            default_task_id: normalizedDefaultTaskId,
          });
          if (result.success) {
            console.log("[settings] verification saved", result.data);
          }

          if (result.success) {
            const saved = result.data;
            const settingsMatch =
              saved.timezone === timezone
              && saved.default_task_id === normalizedDefaultTaskId;

            if (settingsMatch) {
              setIsError(false);
              setMessage("Settings saved.");
              router.refresh();
              return;
            }
          }
        } catch (verificationError) {
          console.error("[settings] verification failed", verificationError);
        }

        setIsError(true);
        router.refresh();
        const message = error instanceof Error ? error.message : "";
        setMessage(message || "Unable to save settings. Please try again.");
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="timezone">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="default-task">
          Default task
        </label>
        <select
          id="default-task"
          name="default-task"
          value={defaultTaskId}
          onChange={(event) => setDefaultTaskId(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
          disabled={tasks.length === 0}
        >
          <option value="">No default task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create a task to set a default.</p>
        ) : null}
      </div>

      {message ? (
        <p
          className={
            isError
              ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
