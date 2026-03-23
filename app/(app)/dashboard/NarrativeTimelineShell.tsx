import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";

type NarrativeTimelineShellProps = {
  items: DashboardOptimizedScreen["narrative"]["items"];
};

export function NarrativeTimelineShell({
  items,
}: NarrativeTimelineShellProps) {
  return (
    <Card className="dashboard-panel dashboard-narrative-shell col-span-12 lg:col-span-5">
      <div className="space-y-1">
        <h2 className="dashboard-panel-heading text-foreground">Today&apos;s Narrative</h2>
        <p className="text-sm text-muted-foreground">
          Derived from today&apos;s focus and queue state without adding speculative story logic.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-narrative-empty">
          <EmptyState
            title="No activity yet"
            description="Start a focus session to populate this timeline."
            actionLabel="Open focus"
            actionHref="/focus"
            className="dashboard-narrative-empty-state"
          />
        </div>
      ) : (
        <ol className="dashboard-timeline">
          {items.map((item) => (
            <li key={item.id} className={`dashboard-timeline-item dashboard-timeline-item-${item.state}`}>
              <p className="text-overline">
                {item.timeLabel} - {item.eyebrow}
              </p>
              {item.href ? (
                <Link href={item.href} className="block">
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </Link>
              ) : (
                <>
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
