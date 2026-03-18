import type { ReactNode } from "react";

import { EmptyState as SharedEmptyState } from "@/components/ui/empty-state";

export function EmptyState({ action }: { action?: ReactNode }) {
  return (
    <SharedEmptyState
      title="No tasks yet"
      description="Add your first task to start your day with clarity."
      action={action}
      actionLabel={action ? undefined : "Create task"}
      actionHref={action ? undefined : "/tasks?compose=1"}
      className="min-h-[220px]"
    />
  );
}
