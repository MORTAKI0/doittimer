import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";
import { ExecutionCompositeChart } from "./ExecutionCompositeChart";

type ExecutionOverviewCardProps = {
  execution: DashboardOptimizedScreen["execution"];
};

export function ExecutionOverviewCard({
  execution,
}: ExecutionOverviewCardProps) {
  return (
    <Card className="dashboard-panel dashboard-panel-chart col-span-12 lg:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="dashboard-panel-heading">Execution Over Time</p>
          <p className="text-[14px] text-muted-foreground">
            Bars = focused minutes. Curve = completed tasks.
          </p>
        </div>
        <div className="dashboard-toggle-shell">
          <Badge variant="accent" className="dashboard-toggle-active">
            Active
          </Badge>
          <span className="dashboard-toggle-inactive">
            Baseline
          </span>
        </div>
      </div>

      <ExecutionCompositeChart points={execution.points} />

      <div className="dashboard-metric-strip">
        <div className="space-y-0.5">
          <p className="text-overline">Total Flow</p>
          <p className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground">
            {execution.metricLabels.totalFlow}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-overline">Completion</p>
          <p className="text-[2rem] font-semibold tracking-[-0.03em] text-emerald-700">
            {execution.metricLabels.completionRate}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-overline">On-Time</p>
          <p className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground">
            {execution.metricLabels.onTimeRate}
          </p>
        </div>
      </div>
    </Card>
  );
}
