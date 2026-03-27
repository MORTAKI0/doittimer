"use client";

import * as React from "react";
import Link from "next/link";

import {
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";
import { useSessionsRealtime } from "@/lib/realtime/useSessionsRealtime";
import { formatDuration } from "@/lib/time/formatDuration";

type ActiveSessionInput = {
  id: string;
  started_at: string;
  ended_at?: string | null;
};

type GlobalRunningSessionWidgetProps = {
  activeSession: ActiveSessionInput | null;
  userId: string | null;
  appName?: string;
};

function readField(record: unknown, key: string) {
  if (!record || typeof record !== "object") return undefined;
  return (record as Record<string, unknown>)[key];
}

function coerceActiveSession(record: unknown): ActiveSessionInput | null {
  const id = readField(record, "id");
  const startedAt = readField(record, "started_at");
  const endedAt = readField(record, "ended_at");

  if (typeof id !== "string" || typeof startedAt !== "string") {
    return null;
  }

  return {
    id,
    started_at: startedAt,
    ended_at: typeof endedAt === "string" ? endedAt : null,
  };
}

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
  userId,
  appName = "DoItTimer",
}: GlobalRunningSessionWidgetProps) {
  const [mounted, setMounted] = React.useState(false);
  const [session, setSession] = React.useState<ActiveSessionInput | null>(
    activeSession,
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const originalTitleRef = React.useRef<string>("");
  const titleInitializedRef = React.useRef(false);
  const sessionRef = React.useRef<ActiveSessionInput | null>(activeSession);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setSession(activeSession);
  }, [activeSession]);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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

  const handleSessionRealtime = React.useCallback((payload: {
    new: unknown;
    old: unknown;
    eventType: string;
  }) => {
    if (!mounted) return;

    const nextSession = coerceActiveSession(payload.new);
    const previousSessionId = (() => {
      const previous = coerceActiveSession(payload.old);
      if (previous?.id) return previous.id;
      const rawId = readField(payload.old, "id");
      return typeof rawId === "string" ? rawId : null;
    })();
    const currentSession = sessionRef.current;

    logClientDiagnostic("active-session:realtime:event", {
      eventType: payload.eventType,
      currentSessionId: currentSession?.id ?? null,
      nextSessionId: nextSession?.id ?? null,
      previousSessionId,
      ...getClientRuntimeSnapshot(),
    });

    if (nextSession && nextSession.ended_at == null) {
      setSession(nextSession);
      return;
    }

    if (
      currentSession
      && (currentSession.id === previousSessionId || currentSession.id === nextSession?.id)
    ) {
      setSession(null);
      setElapsedSeconds(0);
    }
  }, [mounted]);

  useSessionsRealtime({
    userId,
    onEvent: handleSessionRealtime,
  });

  if (!mounted || !session || !isRunning) {
    return null;
  }

  return (
    <div className="pointer-events-none animate-fadeIn fixed bottom-20 left-3 z-40 lg:bottom-4 lg:left-[calc(260px+2rem)]">
      <div className={[
        "pointer-events-auto ui-hover rounded-md border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-emerald-900 shadow-[var(--shadow-glass)] backdrop-blur",
      ].join(" ")}>
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <span
            className={[
              "h-2 w-2 rounded-full transition-colors",
              isRunning ? "animate-pulse-soft bg-emerald-500" : "bg-slate-400",
            ].join(" ")}
          />
          Active session
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="numeric-tabular text-sm font-semibold">
            {formatDuration(elapsedSeconds)}
          </span>
          <Link
            href="/focus"
            className="focus-ring ui-hover rounded-md border-[0.5px] border-emerald-300 bg-white/80 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-white"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
