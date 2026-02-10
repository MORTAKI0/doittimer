"use client";

import * as React from "react";

import { formatDuration } from "@/lib/time/formatDuration";

type FocusCircleTimerProps = {
  startedAt?: string | null;
  isRunning: boolean;
};

export function FocusCircleTimer({
  startedAt,
  isRunning,
}: FocusCircleTimerProps) {
  const [mounted, setMounted] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const startedAtMs = React.useMemo(() => {
    if (!startedAt) return null;
    const parsed = Date.parse(startedAt);
    return Number.isFinite(parsed) ? parsed : null;
  }, [startedAt]);

  React.useEffect(() => {
    if (!mounted || !isRunning || !startedAtMs) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const seconds = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsedSeconds(Math.max(0, seconds));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, mounted, startedAtMs]);

  const display =
    mounted && isRunning && startedAtMs
      ? formatDuration(elapsedSeconds)
      : "00:00:00";

  return (
    <p className="numeric-tabular text-foreground text-5xl font-semibold tracking-tight sm:text-6xl">
      {display}
    </p>
  );
}
