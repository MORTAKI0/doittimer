"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getTabId, subscribeCrossTabEvents } from "@/lib/crossTab/channel";
import { consumeRecentEvent } from "@/lib/realtime/eventDeduper";
import { scheduleRouteRefresh } from "@/lib/realtime/routeRefreshScheduler";
import { useFocusDepsRealtime } from "@/lib/realtime/useFocusDepsRealtime";
import { useSessionsRealtime } from "@/lib/realtime/useSessionsRealtime";

type FocusRealtimeSyncProps = {
  userId: string | null;
  routeKey?: string;
};

function bucketedTimestamp(value: unknown) {
  if (typeof value !== "string") return "0";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "0";
  return String(Math.floor(parsed / 1500));
}

function readField(record: unknown, key: string) {
  if (!record || typeof record !== "object") return undefined;
  return (record as Record<string, unknown>)[key];
}

function readId(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const maybeNewId = readField(payload.new, "id");
  if (typeof maybeNewId === "string") return maybeNewId;
  const maybeOldId = readField(payload.old, "id");
  if (typeof maybeOldId === "string") return maybeOldId;
  return "unknown";
}

function refreshDueToRealtime(
  routeKey: string,
  reason: string,
  routerRefresh: () => void,
  dedupeKey: string,
) {
  if (!consumeRecentEvent(dedupeKey)) return;
  scheduleRouteRefresh({
    routeKey,
    reason,
    refresh: routerRefresh,
  });
}

export function FocusRealtimeSync({ userId, routeKey = "/focus" }: FocusRealtimeSyncProps) {
  const router = useRouter();
  const tabIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    tabIdRef.current = getTabId();
  }, []);

  const handleSessionsRealtimeEvent = React.useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const id = readId(payload);
      const changedAt = bucketedTimestamp(
        readField(payload.new, "edited_at")
          ?? readField(payload.new, "ended_at")
          ?? readField(payload.new, "started_at")
          ?? readField(payload.old, "edited_at")
          ?? readField(payload.old, "ended_at")
          ?? readField(payload.old, "started_at"),
      );
      const coarseKey = `sessions:${id}`;
      const timedKey = `sessions:${id}:${changedAt}`;
      if (!consumeRecentEvent(coarseKey)) return;
      refreshDueToRealtime(routeKey, "realtime:sessions", () => router.refresh(), timedKey);
    },
    [routeKey, router],
  );

  const handleTasksRealtimeEvent = React.useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const id = readId(payload);
      const dedupeKey = `tasks:${id}:${payload.eventType}`;
      refreshDueToRealtime(routeKey, "realtime:tasks", () => router.refresh(), dedupeKey);
    },
    [routeKey, router],
  );

  const handleQueueRealtimeEvent = React.useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const id = readId(payload);
      const dedupeKey = `task_queue_items:${id}:${payload.eventType}`;
      refreshDueToRealtime(routeKey, "realtime:queue", () => router.refresh(), dedupeKey);
    },
    [routeKey, router],
  );

  useSessionsRealtime({
    userId,
    onEvent: handleSessionsRealtimeEvent,
  });

  useFocusDepsRealtime({
    userId,
    onTaskEvent: handleTasksRealtimeEvent,
    onQueueEvent: handleQueueRealtimeEvent,
  });

  React.useEffect(() => {
    return subscribeCrossTabEvents((event) => {
      if (event.sourceTabId === tabIdRef.current) return;
      if (event.routeHint && event.routeHint !== routeKey) return;

      const dedupeKey = event.entityType && event.entityId
        ? `${event.entityType}:${event.entityId}`
        : `event:${event.eventId}`;
      if (!consumeRecentEvent(dedupeKey)) return;

      scheduleRouteRefresh({
        routeKey,
        reason: `broadcast:${event.type}`,
        refresh: () => router.refresh(),
      });
    });
  }, [routeKey, router]);

  return null;
}
