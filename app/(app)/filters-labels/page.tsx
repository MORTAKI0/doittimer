import Link from "next/link";

import { getLabels } from "@/app/actions/labels";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";
import { LabelsManager } from "./LabelsManager";

export const revalidate = 60;

const DEFAULT_FILTERS = [
  { id: "assigned", name: "Assigned to me", query: "assigned:me" },
  { id: "priority-1", name: "Priority 1", query: "priority:1" },
  { id: "due-today", name: "Due today", query: "due:today" },
] as const;

export default async function FiltersLabelsPage() {
  const labelsResult = await getLabels();
  const labels = labelsResult.success ? labelsResult.data : [];
  const labelsError = labelsResult.success ? null : labelsResult.error;

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
        {labelsError ? (
          <EmptyState
            title="Labels are temporarily unavailable"
            description={labelsError}
          />
        ) : (
          <LabelsManager initialLabels={labels} />
        )}
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
