"use client";

import * as React from "react";

import { formatDuration } from "@/lib/time/formatDuration";

type RunningSessionTimerProps = {
  startedAt: string;
};

export function RunningSessionTimer({ startedAt }: RunningSessionTimerProps) {
  const [mounted, setMounted] = React.useState(false);
  const startedAtMs = React.useMemo(
    () => new Date(startedAt).getTime(),
    [startedAt],
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    if (!Number.isFinite(startedAtMs)) {
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
  }, [mounted, startedAtMs]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <span
          className="h-2 w-2 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
        Active session
      </p>
      <p className="numeric-tabular text-foreground text-5xl font-semibold tracking-tight sm:text-6xl">
        {formatDuration(elapsedSeconds)}
      </p>
    </div>
  );
}
