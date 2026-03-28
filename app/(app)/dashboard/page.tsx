import { getDashboardOptimizedScreenData } from "@/app/actions/dashboard";
import { YearFocusHeatmapSection } from "@/components/dashboard/YearFocusHeatmapSection";

import { DashboardOptimizedView } from "./DashboardOptimizedView";

export default async function DashboardPage() {
  const screen = await getDashboardOptimizedScreenData();

  return (
    <DashboardOptimizedView screen={screen}>
      <YearFocusHeatmapSection variant="dashboard" />
    </DashboardOptimizedView>
  );
}
