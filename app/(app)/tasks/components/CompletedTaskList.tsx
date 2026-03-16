"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { restoreTask, type TaskRow } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";

type CompletedTaskListProps = {
  tasks: TaskRow[];
  projects?: { id: string; name: string }[];
};

function formatCompletionTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CompletedTaskList({
  tasks,
  projects = [],
}: CompletedTaskListProps) {
  const router = useRouter();
  const [items, setItems] = React.useState(tasks);
  const [pendingIds, setPendingIds] = React.useState<Record<string, boolean>>({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const projectLabelById = React.useMemo(
    () => new Map(projects.map((project) => [project.id, project.name] as const)),
    [projects],
  );

  async function handleRestore(task: TaskRow) {
    if (pendingIds[task.id]) return;
    setPendingIds((prev) => ({ ...prev, [task.id]: true }));
    setErrorsById((prev) => ({ ...prev, [task.id]: null }));

    const result = await restoreTask(task.id);
    if (!result.success) {
      setErrorsById((prev) => ({ ...prev, [task.id]: result.error }));
      setPendingIds((prev) => ({ ...prev, [task.id]: false }));
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== task.id));
    setPendingIds((prev) => ({ ...prev, [task.id]: false }));
    router.refresh();
  }

  return (
    <ul className="border-t-[0.5px] border-border">
      {items.map((task) => {
        const projectLabel = task.project_id
          ? projectLabelById.get(task.project_id) ?? "Project archived"
          : "Inbox";
        const completionTime = formatCompletionTime(task.completed_at);
        const isPending = Boolean(pendingIds[task.id]);
        const error = errorsById[task.id];

        return (
          <li key={task.id} className="task-row">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="task-title task-title-completed truncate">{task.title}</p>
                <p className="task-meta truncate">
                  {projectLabel}
                  {completionTime ? ` · ${completionTime}` : ""}
                </p>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => void handleRestore(task)}
                disabled={isPending}
              >
                Restore
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
