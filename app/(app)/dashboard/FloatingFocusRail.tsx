"use client";

import * as React from "react";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { IconCalendar, IconFocus, IconTasks } from "@/components/ui/icons";
import type { DashboardOptimizedScreen } from "@/app/actions/dashboard";

type FloatingFocusRailProps = {
  rail: DashboardOptimizedScreen["floatingRail"];
};

function formatElapsed(startedAt: string | null) {
  if (!startedAt) return null;
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return null;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function FloatingFocusRail({ rail }: FloatingFocusRailProps) {
  const [timerLabel, setTimerLabel] = React.useState(
    rail.active ? formatElapsed(rail.startedAt) ?? rail.timerLabel : rail.timerLabel,
  );

  React.useEffect(() => {
    if (!rail.active || !rail.startedAt) {
      setTimerLabel(rail.timerLabel);
      return;
    }

    const tick = () => {
      setTimerLabel(formatElapsed(rail.startedAt) ?? rail.timerLabel);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [rail.active, rail.startedAt, rail.timerLabel]);

  if (!rail.active) {
    return (
      <div className="dashboard-floating-rail">
        <div className="dashboard-floating-rail-status min-w-0">
          <p className="text-overline">Focus</p>
          <p className="text-sm font-semibold text-foreground">No active session</p>
        </div>
        <Link href={rail.primaryHref} className={buttonStyles({ size: "sm" })}>
          {rail.primaryLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-floating-rail">
      <div className="dashboard-floating-rail-status">
        <div className="dashboard-floating-rail-live">
          <span className="dashboard-floating-rail-live-dot" aria-hidden="true" />
          <p className="text-overline">{rail.phaseLabel ? rail.phaseLabel.replace("_", " ") : rail.statusLabel}</p>
        </div>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
          {timerLabel ?? "Live"}
        </p>
        {rail.taskLabel ? (
          <p className="mt-2 truncate text-sm text-muted-foreground">{rail.taskLabel}</p>
        ) : null}
      </div>

      <div className="dashboard-floating-rail-actions">
        <Link href={rail.secondaryHref} className="dashboard-floating-rail-icon" aria-label="Open tasks">
          <IconTasks size={16} />
        </Link>
        <Link href={rail.tertiaryHref} className="dashboard-floating-rail-icon" aria-label="Open focus">
          <IconFocus size={16} />
        </Link>
        <Link href={rail.primaryHref} className={buttonStyles({ size: "sm" })}>
          <IconCalendar size={14} />
          {rail.primaryLabel}
        </Link>
      </div>
    </div>
  );
}
