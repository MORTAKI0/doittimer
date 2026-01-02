"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardTodayStats = {
  focus_seconds: number;
  sessions_count: number;
  tasks_total: number;
  tasks_completed: number;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getDashboardTodayStats(): Promise<ActionResult<DashboardTodayStats>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data, error } = await supabase.rpc("get_dashboard_today_stats");

    if (error) {
      console.error("get_dashboard_today_stats rpc failed", error);
      return { success: false, error: "Unable to load today's stats." };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: {
        focus_seconds: toNumber(row?.focus_seconds),
        sessions_count: toNumber(row?.sessions_count),
        tasks_total: toNumber(row?.tasks_total),
        tasks_completed: toNumber(row?.tasks_completed),
      },
    };
  } catch {
    return {
      success: false,
      error: "Network error. Check your connection and try again.",
    };
  }
}
