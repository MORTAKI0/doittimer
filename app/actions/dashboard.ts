"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardTodayStats = {
  focus_seconds: number;
  sessions_count: number;
  tasks_total: number;
  tasks_completed: number;
};

export type DashboardPomodoroStats = {
  total_work_completed_today: number;
  top_tasks_today: {
    task_id: string;
    task_title: string;
    pomodoros: number;
  }[];
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

function toTopTasks(value: unknown): DashboardPomodoroStats["top_tasks_today"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as {
        task_id?: unknown;
        task_title?: unknown;
        pomodoros?: unknown;
      };
      if (typeof record.task_id !== "string") return null;
      if (typeof record.task_title !== "string") return null;
      return {
        task_id: record.task_id,
        task_title: record.task_title,
        pomodoros: toNumber(record.pomodoros),
      };
    })
    .filter(Boolean) as DashboardPomodoroStats["top_tasks_today"];
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

export async function getDashboardPomodoroStats(): Promise<ActionResult<DashboardPomodoroStats>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data, error } = await supabase.rpc("get_dashboard_pomodoro_stats");

    if (error) {
      console.error("get_dashboard_pomodoro_stats rpc failed", error);
      return { success: false, error: "Unable to load pomodoro stats." };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: {
        total_work_completed_today: toNumber(row?.total_work_completed_today),
        top_tasks_today: toTopTasks(row?.top_tasks_today),
      },
    };
  } catch {
    return {
      success: false,
      error: "Network error. Check your connection and try again.",
    };
  }
}
