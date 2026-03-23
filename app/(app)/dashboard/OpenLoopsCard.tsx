import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";

type OpenLoopsCardProps = {
  items: DashboardOptimizedScreen["openLoops"]["items"];
};

export function OpenLoopsCard({ items }: OpenLoopsCardProps) {
  return (
    <Card className="dashboard-panel dashboard-panel-muted col-span-12 lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dashboard-panel-heading text-foreground">Open Loops</h2>
        <Link
          href="/tasks?compose=1"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          + Capture New
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No open loops"
          description="Capture a task to start filling this board."
          actionLabel="Open tasks"
          actionHref="/tasks"
          className="min-h-[220px] bg-white/70"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="dashboard-open-loop-item">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className="dashboard-open-loop-check"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.projectName ? `Project: ${item.projectName}` : "No project assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.metaLabel ? (
                    <span className="text-[11px] text-muted-foreground">{item.metaLabel}</span>
                  ) : null}
                  {item.chipLabel ? (
                    <span className="dashboard-open-loop-chip">{item.chipLabel}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end pt-2">
        <Link href="/tasks" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          View all tasks
        </Link>
      </div>
    </Card>
  );
}
