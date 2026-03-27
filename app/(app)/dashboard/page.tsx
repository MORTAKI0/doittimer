import { getDashboardOptimizedScreenData } from "@/app/actions/dashboard";

import { DashboardOptimizedView } from "./DashboardOptimizedView";

export default async function DashboardPage() {
  const screen = await getDashboardOptimizedScreenData();

  return <DashboardOptimizedView screen={screen} />;
}
