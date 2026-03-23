import Link from "next/link";

import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";
import { IconFocus, IconSettings } from "@/components/ui/icons";
import { DashboardTopSearch } from "./DashboardTopSearch";
import { DashboardHero } from "./DashboardHero";
import { ExecutionOverviewCard } from "./ExecutionOverviewCard";
import { FloatingFocusRail } from "./FloatingFocusRail";
import { NarrativeTimelineShell } from "./NarrativeTimelineShell";
import { OpenLoopsCard } from "./OpenLoopsCard";
import { PerformanceCardShell } from "./PerformanceCardShell";

type DashboardOptimizedViewProps = {
  screen: DashboardOptimizedScreen;
};

export function DashboardOptimizedView({
  screen,
}: DashboardOptimizedViewProps) {
  const avatarLabel = screen.hero.userLabel.slice(0, 2).toUpperCase();

  return (
    <div className="dashboard-optimized-page">
      <section className="dashboard-topbar-shell hidden lg:flex">
        <DashboardTopSearch />
        <div className="dashboard-topbar-actions">
          <Link href="/settings" className="dashboard-upgrade-pill">
            Upgrade
          </Link>
          <Link
            href="/focus"
            className="dashboard-topbar-icon"
            aria-label="Open focus"
          >
            <IconFocus size={16} />
          </Link>
          <Link
            href="/settings"
            className="dashboard-topbar-icon"
            aria-label="Open settings"
          >
            <IconSettings size={16} />
          </Link>
          <span className="dashboard-topbar-divider" aria-hidden="true" />
          <Link
            href="/settings"
            className="dashboard-topbar-avatar"
            aria-label="Open profile settings"
          >
            {avatarLabel}
          </Link>
        </div>
      </section>

      <DashboardHero
        greeting={screen.hero.greeting}
        userLabel={screen.hero.userLabel}
        dateLabel={screen.hero.dateLabel}
        focusLabel={screen.hero.focusLabel}
      />

      <section className="dashboard-bento-grid">
        <ExecutionOverviewCard execution={screen.execution} />
        <PerformanceCardShell performance={screen.performance} />
        <OpenLoopsCard items={screen.openLoops.items} />
        <NarrativeTimelineShell items={screen.narrative.items} />
      </section>

      <FloatingFocusRail rail={screen.floatingRail} />
    </div>
  );
}
