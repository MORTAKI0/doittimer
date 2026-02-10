"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/logging/logServerError";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type TrendPoint = {
  day: string;
  focus_minutes: number;
  completed_tasks: number;
  on_time_rate: number | null;
};

export type DashboardTrends = {
  days: 7 | 30;
  points: TrendPoint[];
};

type DashboardTrendsRow = {
  day: string;
  focus_minutes: number | null;
  completed_tasks: number | null;
  on_time_rate: number | null;
};

const ERROR_SIGN_IN = "You must be signed in.";
const ERROR_LOAD_TRENDS = "Unable to load dashboard trends.";

function clampRate(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toSafeInt(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function toUtcDayString(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildUtcDaySeries(days: 7 | 30): string[] {
  const now = new Date();
  const todayUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const output: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(todayUtcMs - index * 86_400_000);
    output.push(day.toISOString().slice(0, 10));
  }

  return output;
}

function normalizeRows(
  days: 7 | 30,
  rows: DashboardTrendsRow[],
): DashboardTrends {
  const byDay = new Map<string, DashboardTrendsRow>();

  for (const row of rows) {
    const day = toUtcDayString(row.day);
    if (!day) continue;
    byDay.set(day, row);
  }

  const points = buildUtcDaySeries(days).map((day) => {
    const row = byDay.get(day);

    return {
      day,
      focus_minutes: toSafeInt(row?.focus_minutes ?? 0),
      completed_tasks: toSafeInt(row?.completed_tasks ?? 0),
      on_time_rate: clampRate(row?.on_time_rate ?? null),
    };
  });

  return { days, points };
}

export async function getDashboardTrends(input: {
  days: 7 | 30;
}): Promise<ActionResult<DashboardTrends>> {
  const days = input.days === 30 ? 30 : 7;

  try {
    let userId: string | undefined;
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: ERROR_SIGN_IN };
    }

    userId = userData.user.id;

    const { data, error } = await supabase.rpc("get_dashboard_trends", {
      p_days: days,
    });

    if (error) {
      logServerError({
        scope: "actions.dashboardTrends.getDashboardTrends",
        userId,
        error,
        context: {
          rpc: "get_dashboard_trends",
          days,
        },
      });
      return { success: false, error: ERROR_LOAD_TRENDS };
    }

    const rows = Array.isArray(data) ? (data as DashboardTrendsRow[]) : [];
    return { success: true, data: normalizeRows(days, rows) };
  } catch (error) {
    logServerError({
      scope: "actions.dashboardTrends.getDashboardTrends",
      error,
      context: { days },
    });
    return { success: false, error: ERROR_LOAD_TRENDS };
  }
}
