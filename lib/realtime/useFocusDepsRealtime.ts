"use client";

import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type GenericPayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

type UseFocusDepsRealtimeArgs = {
  userId: string | null;
  onTaskEvent: (payload: GenericPayload) => void;
  onQueueEvent: (payload: GenericPayload) => void;
};

export function useFocusDepsRealtime({
  userId,
  onTaskEvent,
  onQueueEvent,
}: UseFocusDepsRealtimeArgs) {
  React.useEffect(() => {
    if (!userId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`focus:deps:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onTaskEvent(payload as GenericPayload),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_queue_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onQueueEvent(payload as GenericPayload),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onQueueEvent, onTaskEvent, userId]);
}
