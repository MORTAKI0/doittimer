import { getDashboardTrends } from "@/app/actions/dashboardTrends";
import { buildYearFocusHeatmap } from "@/lib/dashboard/heatmap";

import { YearFocusHeatmapClient } from "./YearFocusHeatmapClient";

type YearFocusHeatmapSectionProps = {
  variant?: "home" | "dashboard";
};

export async function YearFocusHeatmapSection({
  variant = "dashboard",
}: YearFocusHeatmapSectionProps) {
  const result = await getDashboardTrends({ days: 365 });

  const sectionClassName =
    variant === "home"
      ? "space-y-4 rounded-[28px] border border-border/70 bg-card/45 px-4 py-5 shadow-[var(--shadow-soft)] sm:px-6 sm:py-6"
      : "space-y-4 rounded-[32px] border border-border/70 bg-card/55 p-5 shadow-[var(--shadow-soft)] sm:p-6";

  if (!result.success) {
    return (
      <section className={sectionClassName} aria-labelledby={`year-focus-${variant}`}>
        <div className="space-y-1">
          <p className="text-overline">Year of Focus</p>
          <h2 id={`year-focus-${variant}`} className="text-base font-semibold text-foreground">
            Consistency, not just momentum
          </h2>
          <p className="text-sm text-muted-foreground">
            The yearly heatmap is unavailable right now.
          </p>
        </div>
      </section>
    );
  }

  const heatmap = buildYearFocusHeatmap(result.data.points);

  return (
    <section className={sectionClassName} aria-labelledby={`year-focus-${variant}`}>
      <div className="space-y-1">
        <p className="text-overline">Year of Focus</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id={`year-focus-${variant}`} className="text-base font-semibold text-foreground">
              Consistency, not just momentum
            </h2>
            <p className="text-sm text-muted-foreground">
              Every square is one day of tracked focus across the last year.
            </p>
          </div>
          <p className="font-mono text-[12px] text-muted-foreground">
            {heatmap.maxMinutes} max min
          </p>
        </div>
      </div>

      <YearFocusHeatmapClient heatmap={heatmap} />
    </section>
  );
}
