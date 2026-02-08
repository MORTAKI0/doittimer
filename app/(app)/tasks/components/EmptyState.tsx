import { EmptyState as SharedEmptyState } from "@/components/ui/empty-state";

export function EmptyState() {
  return (
    <SharedEmptyState
      title="No tasks yet"
      description="Add your first task to start your day with clarity."
      actionLabel="Create task"
      actionHref="/tasks"
      className="min-h-[220px]"
    />
  );
}
