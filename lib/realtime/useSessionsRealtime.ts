"use client";

import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionsPayload = RealtimePostgresChangesPayload<{
  id: string;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  task_id: string | null;
  music_url: string | null;
  pomodoro_phase: string | null;
  pomodoro_phase_started_at: string | null;
  pomodoro_is_paused: boolean | null;
  pomodoro_paused_at: string | null;
  pomodoro_cycle_count: number | null;
  edited_at: string | null;
  edit_reason: string | null;
}>;

type UseSessionsRealtimeArgs = {
  userId: string | null;
  onEvent: (payload: SessionsPayload) => void;
};

export function useSessionsRealtime({ userId, onEvent }: UseSessionsRealtimeArgs) {
  React.useEffect(() => {
    if (!userId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`focus:sessions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onEvent(payload as SessionsPayload),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onEvent, userId]);
}
