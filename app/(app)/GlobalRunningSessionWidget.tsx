"use client";

import * as React from "react";
import Link from "next/link";

import { formatDuration } from "@/lib/time/formatDuration";

type ActiveSessionInput = {
  id: string;
  started_at: string;
  ended_at?: string | null;
};

type GlobalRunningSessionWidgetProps = {
  activeSession: ActiveSessionInput | null;
  appName?: string;
};

type ActiveSessionResponse = {
  activeSession: ActiveSessionInput | null;
};

function formatTitleTime(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  if (clamped < 3600) {
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return formatDuration(clamped);
}

export function GlobalRunningSessionWidget({
  activeSession,
  appName = "DoItTimer",
}: GlobalRunningSessionWidgetProps) {
  const [mounted, setMounted] = React.useState(false);
  const [session, setSession] = React.useState<ActiveSessionInput | null>(
    activeSession,
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const originalTitleRef = React.useRef<string>("");
  const titleInitializedRef = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setSession(activeSession);
  }, [activeSession]);

  React.useEffect(() => {
    if (!mounted) return;

    if (!titleInitializedRef.current) {
      originalTitleRef.current = document.title;
      titleInitializedRef.current = true;
    }

    return () => {
      if (titleInitializedRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [mounted]);

  const startedAtMs = React.useMemo(() => {
    if (!session) return null;
    const parsed = Date.parse(session.started_at);
    return Number.isFinite(parsed) ? parsed : null;
  }, [session]);

  const isRunning = Boolean(session && session.ended_at == null && startedAtMs);

  React.useEffect(() => {
    if (!mounted || !isRunning || !startedAtMs) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const next = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsedSeconds(Math.max(0, next));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, mounted, startedAtMs]);

  React.useEffect(() => {
    if (!mounted || !titleInitializedRef.current) return;

    if (!isRunning) {
      document.title = appName;
      return;
    }

    document.title = `⏱ ${formatTitleTime(elapsedSeconds)} • ${appName}`;
  }, [appName, elapsedSeconds, isRunning, mounted]);

  React.useEffect(() => {
    if (!mounted) return;

    const poll = async () => {
      try {
        const response = await fetch("/api/sessions/active", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as ActiveSessionResponse;
        const nextSession = data.activeSession ?? null;
        setSession(nextSession);
        if (!nextSession) {
          setElapsedSeconds(0);
        }
      } catch {
        // Ignore transient polling errors.
      }
    };

    void poll();
    const pollTimer = window.setInterval(() => {
      void poll();
    }, 15000);

    return () => window.clearInterval(pollTimer);
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="animate-fadeInUp fixed bottom-20 left-3 z-40 lg:bottom-4 lg:left-4">
      <div className={[
        "rounded-xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-emerald-900 shadow-[var(--shadow-lift)] backdrop-blur transition-shadow duration-300",
        isRunning ? "animate-glowPulse" : "",
      ].join(" ")}>
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <span
            className={[
              "h-2 w-2 rounded-full transition-colors",
              isRunning ? "animate-pulse bg-emerald-500" : "bg-slate-400",
            ].join(" ")}
          />
          {isRunning ? "Active session" : "No active session"}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="numeric-tabular text-sm font-semibold">
            {isRunning ? formatDuration(elapsedSeconds) : "00:00:00"}
          </span>
          <Link
            href="/focus"
            className="rounded-md border border-emerald-300 bg-white/80 px-2 py-1 text-[11px] font-medium text-emerald-800 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            {isRunning ? "Open" : "Go to Focus"}
          </Link>
        </div>
      </div>
    </div>
  );
}
