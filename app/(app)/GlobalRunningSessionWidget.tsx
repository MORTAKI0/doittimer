"use client";

import * as React from "react";
import Link from "next/link";

import { subscribeCrossTabEvents } from "@/lib/crossTab/channel";
import {
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";
import { consumeRecentEvent } from "@/lib/realtime/eventDeduper";
import { scheduleRouteRefresh } from "@/lib/realtime/routeRefreshScheduler";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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

type ActiveSessionResponse = {
  activeSession: ActiveSessionInput | null;
};

const ACTIVE_SESSION_POLL_MS = 15_000;
const DEV_FAILURE_PAUSE_THRESHOLD = 3;

function readField(record: unknown, key: string) {
  if (!record || typeof record !== "object") return undefined;
  return (record as Record<string, unknown>)[key];
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
  const isProduction = process.env.NODE_ENV === "production";
  const [mounted, setMounted] = React.useState(false);
  const [session, setSession] = React.useState<ActiveSessionInput | null>(
    activeSession,
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const originalTitleRef = React.useRef<string>("");
  const titleInitializedRef = React.useRef(false);
  const consecutiveFailuresRef = React.useRef(0);
  const pollingPausedRef = React.useRef(false);
  const pollAttemptRef = React.useRef(0);

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

  const syncActiveSession = React.useCallback(
    async (options?: { allowWhilePaused?: boolean }) => {
      if (!mounted) return false;
      if (pollingPausedRef.current && !options?.allowWhilePaused) {
        logClientDiagnostic("active-session:poll:skipped", {
          reason: "paused",
          failureCount: consecutiveFailuresRef.current,
          allowWhilePaused: options?.allowWhilePaused ?? false,
          ...getClientRuntimeSnapshot(),
        });
        return false;
      }

      pollAttemptRef.current += 1;
      const attemptId = pollAttemptRef.current;
      logClientDiagnostic("active-session:poll:start", {
        attemptId,
        failureCount: consecutiveFailuresRef.current,
        allowWhilePaused: options?.allowWhilePaused ?? false,
        ...getClientRuntimeSnapshot(),
      });

      try {
        const response = await fetch("/api/sessions/active", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          logClientDiagnostic("active-session:poll:response", {
            attemptId,
            ok: false,
            status: response.status,
            failureCount: consecutiveFailuresRef.current,
            ...getClientRuntimeSnapshot(),
          });
          throw new Error(`Active session request failed with ${response.status}`);
        }

        const data = (await response.json()) as ActiveSessionResponse;
        const nextSession = data.activeSession ?? null;
        consecutiveFailuresRef.current = 0;
        pollingPausedRef.current = false;
        logClientDiagnostic("active-session:poll:success", {
          attemptId,
          status: response.status,
          activeSessionId: nextSession?.id ?? null,
          ...getClientRuntimeSnapshot(),
        });
        setSession(nextSession);
        if (!nextSession) {
          setElapsedSeconds(0);
        }
        return true;
      } catch (error) {
        consecutiveFailuresRef.current += 1;
        const shouldPause =
          !isProduction
          && consecutiveFailuresRef.current >= DEV_FAILURE_PAUSE_THRESHOLD;

        if (shouldPause) {
          pollingPausedRef.current = true;
        }

        logClientDiagnostic("active-session:poll:error", {
          attemptId,
          message: error instanceof Error ? error.message : String(error),
          failureCount: consecutiveFailuresRef.current,
          paused: pollingPausedRef.current,
          threshold: DEV_FAILURE_PAUSE_THRESHOLD,
          ...getClientRuntimeSnapshot(),
        });

        return false;
      }
    },
    [isProduction, mounted],
  );

  React.useEffect(() => {
    if (!mounted || !session) return;

    let cancelled = false;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const nextDelay = () => {
      if (isProduction) return ACTIVE_SESSION_POLL_MS;
      if (consecutiveFailuresRef.current <= 0) return ACTIVE_SESSION_POLL_MS;
      if (consecutiveFailuresRef.current === 1) return ACTIVE_SESSION_POLL_MS * 2;
      return ACTIVE_SESSION_POLL_MS * 4;
    };

    const scheduleNext = (delay: number) => {
      clearTimer();
      timer = window.setTimeout(() => {
        void runPollLoop();
      }, delay);
    };

    const runPollLoop = async () => {
      if (cancelled) return;

      await syncActiveSession();

      if (cancelled || pollingPausedRef.current || !session) {
        if (pollingPausedRef.current) {
          logClientDiagnostic("active-session:poll:backoff-paused", {
            failureCount: consecutiveFailuresRef.current,
            ...getClientRuntimeSnapshot(),
          });
        }
        return;
      }

      const delay = nextDelay();
      logClientDiagnostic("active-session:poll:scheduled", {
        delayMs: delay,
        failureCount: consecutiveFailuresRef.current,
        ...getClientRuntimeSnapshot(),
      });
      scheduleNext(delay);
    };

    void runPollLoop();

    const resumePolling = () => {
      if (cancelled || document.visibilityState === "hidden" || !session) {
        return;
      }

      pollingPausedRef.current = false;
      logClientDiagnostic("active-session:poll:resume", {
        failureCount: consecutiveFailuresRef.current,
        ...getClientRuntimeSnapshot(),
      });
      clearTimer();
      void runPollLoop();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumePolling();
      }
    };

    window.addEventListener("online", resumePolling);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimer();
      window.removeEventListener("online", resumePolling);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isProduction, mounted, session, syncActiveSession]);

  const scheduleWidgetPoll = React.useCallback(() => {
    scheduleRouteRefresh({
      routeKey: "global-active-session",
      reason: "sync:active-session",
      refresh: () => {
        void (async () => {
          await syncActiveSession({ allowWhilePaused: true });
        })();
      },
    });
  }, [syncActiveSession]);

  React.useEffect(() => {
    if (!mounted) return;

    return subscribeCrossTabEvents((event) => {
      if (!event.type.startsWith("focus:")) return;
      const key = event.entityId ? `sessions:${event.entityId}` : `event:${event.eventId}`;
      if (!consumeRecentEvent(key)) return;
      logClientDiagnostic("active-session:poll:cross-tab-refresh", {
        eventType: event.type,
        eventId: event.eventId,
        entityId: event.entityId ?? null,
        ...getClientRuntimeSnapshot(),
      });
      scheduleWidgetPoll();
    });
  }, [mounted, scheduleWidgetPoll]);

  React.useEffect(() => {
    if (!mounted || !userId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`global:sessions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const maybeNewId = readField(payload.new, "id");
          const maybeOldId = readField(payload.old, "id");
          const maybeId = typeof maybeNewId === "string"
            ? maybeNewId
            : typeof maybeOldId === "string"
              ? maybeOldId
              : "unknown";
          if (!consumeRecentEvent(`sessions:${maybeId}`)) return;
          logClientDiagnostic("active-session:poll:realtime-refresh", {
            sessionId: maybeId,
            ...getClientRuntimeSnapshot(),
          });
          scheduleWidgetPoll();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mounted, scheduleWidgetPoll, userId]);

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
