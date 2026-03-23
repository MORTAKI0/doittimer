import { Card } from "@/components/ui/card";
import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";

type PerformanceCardShellProps = {
  performance: DashboardOptimizedScreen["performance"];
};

export function PerformanceCardShell({
  performance,
}: PerformanceCardShellProps) {
  return (
    <Card className="dashboard-panel dashboard-performance-shell col-span-12 lg:col-span-4">
      <div className="space-y-3">
        <h2 className="dashboard-panel-heading text-[#0f3a2a]">Performance</h2>
        <p className="max-w-[17rem] text-sm leading-6 text-[#0f5132]/80">
          {performance.description}
        </p>
      </div>

      <div className="space-y-3 pt-18">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[#0f3a2a]">Active Days</span>
          <span className="text-[2rem] font-semibold tracking-[-0.03em] text-[#0f3a2a]">
            {performance.activeDays}/{performance.totalDays}
          </span>
        </div>
        <div className="dashboard-performance-progress">
          <div
            className="dashboard-performance-progress-bar"
            style={{
              width: `${Math.min(
                100,
                Math.max(12, (performance.activeDays / Math.max(1, performance.totalDays)) * 100),
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="dashboard-performance-callout mt-auto">
        <p className="text-overline text-[#0f3a2a]/55">Today</p>
        <p className="mt-2 text-base font-semibold text-[#0f3a2a]">
          {performance.focusTodayLabel} focused
        </p>
        <p className="mt-1 text-sm leading-6 text-[#0f5132]/80">
          {performance.completedToday} completed task{performance.completedToday === 1 ? "" : "s"} · {performance.onTimeRateLabel} on-time
        </p>
      </div>
    </Card>
  );
}
