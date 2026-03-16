import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";

const DEFAULT_FILTERS = [
  { id: "assigned", name: "Assigned to me", query: "assigned:me" },
  { id: "priority-1", name: "Priority 1", query: "priority:1" },
  { id: "due-today", name: "Due today", query: "due:today" },
] as const;

export default function FiltersLabelsPage() {
  return (
    <div className="page-content-column space-y-8">
      <TaskPageHeader
        title="Filters & Labels"
        description="Saved views and labels will live here as the task model grows."
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="page-section-label">My Filters</h2>
          <p className="text-sm text-muted-foreground">
            Default productivity views available in Phase 1.
          </p>
        </div>
        <div className="space-y-0 border-t-[0.5px] border-border">
          {DEFAULT_FILTERS.map((filter) => (
            <div key={filter.id} className="task-row flex items-center justify-between gap-3">
              <div>
                <p className="task-title">{filter.name}</p>
                <p className="task-meta">{filter.query}</p>
              </div>
              <span className="text-muted-ui">Default</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="page-section-label">Labels</h2>
          <p className="text-sm text-muted-foreground">
            Label CRUD and task-level label assignment need backend tables before this view can become interactive.
          </p>
        </div>
        <EmptyState
          title="Labels are not connected yet"
          description="This page is wired and navigable, but label data depends on the future labels and task_labels backend tables."
        />
      </section>

      <section className="space-y-3">
        <h2 className="page-section-label">Planned integrations</h2>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonStyles({ size: "sm", variant: "secondary" })} href="/today">
            Due today
          </Link>
          <Link className={buttonStyles({ size: "sm", variant: "secondary" })} href="/upcoming">
            Upcoming
          </Link>
        </div>
      </section>
    </div>
  );
}
