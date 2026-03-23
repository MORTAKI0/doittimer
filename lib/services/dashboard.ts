import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import { getTaskQueueForUser } from "@/lib/services/queue";
import {
  getActiveSessionForUser,
  getSessionsForUser,
  type SessionRow,
} from "@/lib/services/sessions";

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

export type DashboardRange = "today" | "yesterday" | "this_week" | "last_week" | "custom";

export type TaskLite = {
  id: string;
  title: string;
  scheduled_for: string | null;
  completed: boolean;
  archived_at: string | null;
};

export type QueueItemLite = {
  task_id: string;
  title: string;
  created_at: string;
};

export type DashboardSummary = {
  range: {
    fromISO: string;
    toISO: string;
    tz: string;
    label: string;
  };
  kpis: {
    created: number;
    completed: number;
    archived: number;
    queueCount: number;
    completionRate: number;
    onTimeRate: number;
  };
  today: {
    scheduled: TaskLite[];
    unscheduled: TaskLite[];
    scheduledTotal: number;
    unscheduledTotal: number;
  };
  queue: {
    items: QueueItemLite[];
    total: number;
  };
};

export type WorkTotals = {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
};

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

export type DashboardOpenLoopItem = {
  id: string;
  title: string;
  scheduled_for: string | null;
  completed: boolean;
  projectName: string | null;
  metaLabel: string | null;
  chipLabel: string | null;
  href: string;
};

export type DashboardNarrativeItem = {
  id: string;
  timeLabel: string;
  eyebrow: string;
  title: string;
  detail: string;
  state: "past" | "current" | "upcoming";
  href: string | null;
};

export type DashboardOptimizedScreen = {
  hero: {
    greeting: string;
    userLabel: string;
    dateLabel: string;
    focusLabel: string;
  };
  execution: {
    points: TrendPoint[];
    metricLabels: {
      totalFlow: string;
      completionRate: string;
      onTimeRate: string;
    };
  };
  performance: {
    activeDays: number;
    totalDays: number;
    focusTodayLabel: string;
    completedToday: number;
    onTimeRateLabel: string;
    title: string;
    description: string;
    detail: string;
  };
  openLoops: {
    items: DashboardOpenLoopItem[];
  };
  narrative: {
    items: DashboardNarrativeItem[];
  };
  floatingRail: {
    active: boolean;
    statusLabel: string;
    timerLabel: string | null;
    taskLabel: string | null;
    phaseLabel: string | null;
    startedAt: string | null;
    primaryHref: string;
    secondaryHref: string;
    tertiaryHref: string;
    primaryLabel: string;
  };
};

type GetDashboardSummaryInput = {
  range: DashboardRange;
  from?: string;
  to?: string;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

type TaskCountRow = {
  scheduled_for: string | null;
  completed_at: string | null;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DASHBOARD_TIMEZONE_FALLBACK = "UTC";
const WORK_TOTALS_TIMEZONE_FALLBACK = "Africa/Casablanca";
const TASK_LIST_LIMIT = 8;
const QUEUE_LIST_LIMIT = 8;
const ERROR_SUMMARY = "Unable to load dashboard.";
const ERROR_WORK_TOTALS = "Unable to load work totals.";
const ERROR_TRENDS = "Unable to load dashboard trends.";

function isValidDateOnly(value: string | undefined): value is string {
  if (!value || !DATE_ONLY_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime());
}

function addDays(date: LocalDate, days: number): LocalDate {
  const sourceMs = Date.UTC(date.year, date.month - 1, date.day);
  const shifted = new Date(sourceMs + days * 86_400_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function weekday(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function localDateToISO(date: LocalDate): string {
  const yyyy = String(date.year).padStart(4, "0");
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateParts(value: string): LocalDate {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function datePartsAt(instant: Date, tz: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(instant);
  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type === "literal") continue;
    if (part.type in values) continue;
    const parsed = Number(part.value);
    if (Number.isFinite(parsed)) {
      values[part.type] = parsed;
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function offsetMsAt(instant: Date, tz: string): number {
  const parts = datePartsAt(instant, tz);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

function zonedMidnightToUtc(date: LocalDate, tz: string): Date {
  const targetUtc = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0);
  let guess = targetUtc;

  for (let index = 0; index < 4; index += 1) {
    const offset = offsetMsAt(new Date(guess), tz);
    const next = targetUtc - offset;
    if (next === guess) break;
    guess = next;
  }

  return new Date(guess);
}

function dateInTimezone(instant: Date, tz: string): LocalDate {
  const parts = datePartsAt(instant, tz);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function weekStartMonday(date: LocalDate): LocalDate {
  const currentDay = weekday(date);
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  return addDays(date, diff);
}

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value || value.trim().length === 0) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function getUserTimeZone(
  supabase: SupabaseClient,
  userId: string,
  fallback: string,
) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return isValidTimezone(data?.timezone) ? data.timezone : fallback;
}

function getRangeBounds(input: GetDashboardSummaryInput, tz: string): DateRange {
  const now = new Date();
  const today = dateInTimezone(now, tz);

  if (input.range === "today") {
    return {
      from: zonedMidnightToUtc(today, tz),
      to: zonedMidnightToUtc(addDays(today, 1), tz),
      label: "Today",
    };
  }

  if (input.range === "yesterday") {
    const start = addDays(today, -1);
    return {
      from: zonedMidnightToUtc(start, tz),
      to: zonedMidnightToUtc(today, tz),
      label: "Yesterday",
    };
  }

  if (input.range === "this_week") {
    const start = weekStartMonday(today);
    return {
      from: zonedMidnightToUtc(start, tz),
      to: zonedMidnightToUtc(addDays(start, 7), tz),
      label: "This week",
    };
  }

  if (input.range === "last_week") {
    const thisWeekStart = weekStartMonday(today);
    const lastWeekStart = addDays(thisWeekStart, -7);
    return {
      from: zonedMidnightToUtc(lastWeekStart, tz),
      to: zonedMidnightToUtc(thisWeekStart, tz),
      label: "Last week",
    };
  }

  const fallbackFrom = zonedMidnightToUtc(today, tz);
  const fallbackTo = zonedMidnightToUtc(addDays(today, 1), tz);

  if (!isValidDateOnly(input.from) || !isValidDateOnly(input.to)) {
    return {
      from: fallbackFrom,
      to: fallbackTo,
      label: "Custom",
    };
  }

  const fromDate = parseDateParts(input.from);
  const toDate = parseDateParts(input.to);
  const from = zonedMidnightToUtc(fromDate, tz);
  let to = zonedMidnightToUtc(toDate, tz);

  if (to <= from) {
    to = zonedMidnightToUtc(addDays(fromDate, 1), tz);
  }

  return {
    from,
    to,
    label: "Custom",
  };
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function toSafeSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return 0;
}

function localDateFromIso(isoString: string, tz: string): string {
  return localDateToISO(dateInTimezone(new Date(isoString), tz));
}

function normalizeTaskLiteRow(row: TaskLite): TaskLite {
  return {
    id: row.id,
    title: row.title,
    scheduled_for: row.scheduled_for,
    completed: row.completed,
    archived_at: row.archived_at,
  };
}

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

function startOfUtcDayIso(day: string) {
  return `${day}T00:00:00.000Z`;
}

function nextUtcDayIso(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function formatDurationLabel(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatPercentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLongDateLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function greetingForTimeZone(timeZone: string) {
  const hour = datePartsAt(new Date(), timeZone).hour;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function titleCaseLabel(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function deriveUserLabel(
  userEmail: string | null | undefined,
  userDisplayName?: string | null,
) {
  if (typeof userDisplayName === "string" && userDisplayName.trim().length > 0) {
    return userDisplayName.trim().split(/\s+/)[0] ?? "there";
  }

  if (!userEmail) return "there";
  const localPart = userEmail.split("@")[0] ?? "";
  if (!localPart) return "there";
  return titleCaseLabel(localPart);
}

function formatElapsedSince(startedAt: string) {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return null;

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - startedAtMs) / 1000),
  );
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function chipLabelForTask(
  task: TaskLite & { pomodoro_work_minutes?: number | null },
) {
  if (typeof task.pomodoro_work_minutes === "number" && task.pomodoro_work_minutes > 0) {
    return `${task.pomodoro_work_minutes}m`;
  }

  if (task.scheduled_for) {
    return "Today";
  }

  return null;
}

function metaLabelForTask(task: {
  scheduled_for: string | null;
  projectName: string | null;
}) {
  if (task.scheduled_for) {
    const parsed = new Date(`${task.scheduled_for}T00:00:00.000Z`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(parsed);
  }

  if (task.projectName) {
    return task.projectName;
  }

  return null;
}

function buildSessionNarrativeItems(
  sessions: SessionRow[],
  timeZone: string,
): DashboardNarrativeItem[] {
  return sessions
    .filter((session) => session.ended_at)
    .sort((left, right) => {
      const leftTime = Date.parse(left.started_at);
      const rightTime = Date.parse(right.started_at);
      return leftTime - rightTime;
    })
    .slice(-2)
    .map((session) => ({
      id: session.id,
      timeLabel: formatTimeLabel(session.started_at, timeZone),
      eyebrow: "Completed Focus",
      title: session.task_title ?? "Focus Session",
      detail:
        session.duration_seconds != null
          ? `Focused for ${formatDurationLabel(session.duration_seconds)}.`
          : "Completed focus session.",
      state: "past" as const,
      href: "/focus",
    }));
}

async function countTasksInRange(
  supabase: SupabaseClient,
  userId: string,
  field: "created_at" | "completed_at" | "archived_at",
  fromISO: string,
  toISO: string,
) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte(field, fromISO)
    .lt(field, toISO);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getWorkTotalsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<WorkTotals>> {
  try {
    const timeZone = await getUserTimeZone(
      supabase,
      userId,
      WORK_TOTALS_TIMEZONE_FALLBACK,
    );
    const now = new Date();
    const nowIso = now.toISOString();
    const today = dateInTimezone(now, timeZone);
    const todayStart = zonedMidnightToUtc(today, timeZone);
    const weekStart = zonedMidnightToUtc(weekStartMonday(today), timeZone);
    const monthStart = zonedMidnightToUtc(
      { year: today.year, month: today.month, day: 1 },
      timeZone,
    );

    const [finishedResult, runningResult] = await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .gte("started_at", monthStart.toISOString())
        .lt("started_at", nowIso),
      supabase
        .from("sessions")
        .select("started_at")
        .eq("user_id", userId)
        .is("ended_at", null)
        .lt("started_at", nowIso),
    ]);

    if (finishedResult.error) throw finishedResult.error;
    if (runningResult.error) throw runningResult.error;

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;

    for (const row of finishedResult.data ?? []) {
      const duration = toSafeSeconds(row.duration_seconds);
      const startedAt = Date.parse(row.started_at);
      if (!Number.isFinite(startedAt)) continue;

      if (startedAt >= monthStart.getTime()) monthSeconds += duration;
      if (startedAt >= weekStart.getTime()) weekSeconds += duration;
      if (startedAt >= todayStart.getTime()) todaySeconds += duration;
    }

    for (const row of runningResult.data ?? []) {
      const startedAt = Date.parse(row.started_at);
      if (!Number.isFinite(startedAt)) continue;

      const nowMs = now.getTime();
      const monthOverlap = Math.max(
        0,
        Math.floor((nowMs - Math.max(startedAt, monthStart.getTime())) / 1000),
      );
      const weekOverlap = Math.max(
        0,
        Math.floor((nowMs - Math.max(startedAt, weekStart.getTime())) / 1000),
      );
      const todayOverlap = Math.max(
        0,
        Math.floor((nowMs - Math.max(startedAt, todayStart.getTime())) / 1000),
      );

      monthSeconds += monthOverlap;
      weekSeconds += weekOverlap;
      todaySeconds += todayOverlap;
    }

    return {
      success: true,
      data: {
        todaySeconds,
        weekSeconds,
        monthSeconds,
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.dashboard.getWorkTotalsForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_WORK_TOTALS };
  }
}

export async function getDashboardSummaryForUser(
  supabase: SupabaseClient,
  userId: string,
  range: DashboardRange,
  from?: string,
  to?: string,
): Promise<ServiceResult<DashboardSummary>> {
  try {
    const timeZone = await getUserTimeZone(
      supabase,
      userId,
      DASHBOARD_TIMEZONE_FALLBACK,
    );
    const selectedRange = getRangeBounds({ range, from, to }, timeZone);
    const fromISO = selectedRange.from.toISOString();
    const toISO = selectedRange.to.toISOString();

    const [created, completed, archived, queueCount] = await Promise.all([
      countTasksInRange(supabase, userId, "created_at", fromISO, toISO),
      countTasksInRange(supabase, userId, "completed_at", fromISO, toISO),
      countTasksInRange(supabase, userId, "archived_at", fromISO, toISO),
      supabase
        .from("task_queue_items")
        .select("task_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .then(({ count, error }) => {
          if (error) throw error;
          return count ?? 0;
        }),
    ]);

    const completionRate = toRate(completed, created);

    const { count: onTimeDenominatorCount, error: onTimeDenominatorError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", fromISO)
      .lt("completed_at", toISO)
      .not("scheduled_for", "is", null);

    if (onTimeDenominatorError) {
      throw onTimeDenominatorError;
    }

    let onTimeNumerator = 0;
    const onTimeDenominator = onTimeDenominatorCount ?? 0;

    if (onTimeDenominator > 0) {
      const { data: onTimeRows, error: onTimeRowsError } = await supabase
        .from("tasks")
        .select("scheduled_for, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", fromISO)
        .lt("completed_at", toISO)
        .not("scheduled_for", "is", null);

      if (onTimeRowsError) {
        throw onTimeRowsError;
      }

      onTimeNumerator = ((onTimeRows ?? []) as TaskCountRow[]).reduce((total, row) => {
        if (!row.completed_at || !row.scheduled_for) return total;
        const completedDate = localDateFromIso(row.completed_at, timeZone);
        return completedDate <= row.scheduled_for ? total + 1 : total;
      }, 0);
    }

    const onTimeRate = toRate(onTimeNumerator, onTimeDenominator);
    const today = dateInTimezone(new Date(), timeZone);
    const todayISO = localDateToISO(today);

    const [scheduledTotal, unscheduledTotal, scheduledRows, unscheduledRows] = await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null)
        .eq("scheduled_for", todayISO)
        .then(({ count, error }) => {
          if (error) throw error;
          return count ?? 0;
        }),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null)
        .is("scheduled_for", null)
        .then(({ count, error }) => {
          if (error) throw error;
          return count ?? 0;
        }),
      supabase
        .from("tasks")
        .select("id, title, scheduled_for, completed, archived_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .eq("scheduled_for", todayISO)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(TASK_LIST_LIMIT)
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as TaskLite[];
        }),
      supabase
        .from("tasks")
        .select("id, title, scheduled_for, completed, archived_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .is("scheduled_for", null)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(TASK_LIST_LIMIT)
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as TaskLite[];
        }),
    ]);

    const { data: queueRows, error: queueRowsError } = await supabase
      .from("task_queue_items")
      .select("task_id, created_at")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(QUEUE_LIST_LIMIT);

    if (queueRowsError) {
      throw queueRowsError;
    }

    const taskIds = (queueRows ?? []).map((row) => row.task_id);
    const titleByTaskId = new Map<string, string>();

    if (taskIds.length > 0) {
      const { data: titleRows, error: titleRowsError } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("user_id", userId)
        .in("id", taskIds);

      if (titleRowsError) {
        throw titleRowsError;
      }

      for (const row of titleRows ?? []) {
        titleByTaskId.set(row.id, row.title);
      }
    }

    const queueItems: QueueItemLite[] = (queueRows ?? []).map((row) => ({
      task_id: row.task_id,
      title: titleByTaskId.get(row.task_id) ?? "Untitled task",
      created_at: row.created_at,
    }));

    return {
      success: true,
      data: {
        range: {
          fromISO,
          toISO,
          tz: timeZone,
          label: selectedRange.label,
        },
        kpis: {
          created,
          completed,
          archived,
          queueCount,
          completionRate,
          onTimeRate,
        },
        today: {
          scheduled: scheduledRows.map(normalizeTaskLiteRow),
          unscheduled: unscheduledRows.map(normalizeTaskLiteRow),
          scheduledTotal,
          unscheduledTotal,
        },
        queue: {
          items: queueItems,
          total: queueCount,
        },
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.dashboard.getDashboardSummaryForUser",
      userId,
      error,
      context: {
        range,
        from: from ?? null,
        to: to ?? null,
      },
    });
    return { success: false, error: ERROR_SUMMARY };
  }
}

export async function getDashboardTrendsForUser(
  supabase: SupabaseClient,
  userId: string,
  days: number,
): Promise<ServiceResult<DashboardTrends>> {
  const normalizedDays: 7 | 30 = days === 30 ? 30 : 7;

  try {
    const daySeries = buildUtcDaySeries(normalizedDays);
    const startDay = daySeries[0];
    const endExclusive = nextUtcDayIso(daySeries[daySeries.length - 1]);

    const [sessionsResult, tasksResult] = await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .gte("started_at", startOfUtcDayIso(startDay))
        .lt("started_at", endExclusive),
      supabase
        .from("tasks")
        .select("completed_at, scheduled_for")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("completed_at", startOfUtcDayIso(startDay))
        .lt("completed_at", endExclusive),
    ]);

    if (sessionsResult.error) throw sessionsResult.error;
    if (tasksResult.error) throw tasksResult.error;

    const focusSecondsByDay = new Map<string, number>();
    for (const row of sessionsResult.data ?? []) {
      const day = new Date(row.started_at).toISOString().slice(0, 10);
      focusSecondsByDay.set(
        day,
        (focusSecondsByDay.get(day) ?? 0) + toSafeSeconds(row.duration_seconds),
      );
    }

    const completedByDay = new Map<
      string,
      { completed: number; scheduledCompleted: number; onTimeCompleted: number }
    >();

    for (const row of tasksResult.data ?? []) {
      if (!row.completed_at) continue;
      const day = new Date(row.completed_at).toISOString().slice(0, 10);
      const current = completedByDay.get(day) ?? {
        completed: 0,
        scheduledCompleted: 0,
        onTimeCompleted: 0,
      };

      current.completed += 1;
      if (row.scheduled_for) {
        current.scheduledCompleted += 1;
        if (day <= row.scheduled_for) {
          current.onTimeCompleted += 1;
        }
      }

      completedByDay.set(day, current);
    }

    return {
      success: true,
      data: {
        days: normalizedDays,
        points: daySeries.map((day) => {
          const completed = completedByDay.get(day);
          return {
            day,
            focus_minutes: Math.floor((focusSecondsByDay.get(day) ?? 0) / 60),
            completed_tasks: toSafeInt(completed?.completed ?? 0),
            on_time_rate:
              completed && completed.scheduledCompleted > 0
                ? clampRate(completed.onTimeCompleted / completed.scheduledCompleted)
                : null,
          };
        }),
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.dashboard.getDashboardTrendsForUser",
      userId,
      error,
      context: { days: normalizedDays },
    });
    return { success: false, error: ERROR_TRENDS };
  }
}

export async function getDashboardOptimizedScreenForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
  userDisplayName?: string | null,
): Promise<ServiceResult<DashboardOptimizedScreen>> {
  try {
    const timeZone = await getUserTimeZone(
      supabase,
      userId,
      DASHBOARD_TIMEZONE_FALLBACK,
    );
    const [summaryResult, workTotalsResult, trendsResult, activeSessionResult, sessionsResult, queueResult] =
      await Promise.all([
        getDashboardSummaryForUser(supabase, userId, "today"),
        getWorkTotalsForUser(supabase, userId),
        getDashboardTrendsForUser(supabase, userId, 7),
        getActiveSessionForUser(supabase, userId),
        getSessionsForUser(supabase, userId, { timeZone }),
        getTaskQueueForUser(supabase, userId),
      ]);

    if (!summaryResult.success) return summaryResult;
    if (!workTotalsResult.success) return workTotalsResult;
    if (!trendsResult.success) return trendsResult;
    if (!activeSessionResult.success) return activeSessionResult;
    if (!sessionsResult.success) return sessionsResult;
    if (!queueResult.success) return queueResult;

    const summary = summaryResult.data;
    const workTotals = workTotalsResult.data;
    const trends = trendsResult.data;
    const activeSession = activeSessionResult.data;
    const sessions = sessionsResult.data;
    const queue = queueResult.data;

    const openLoopRows = await supabase
      .from("tasks")
      .select(
        "id, title, scheduled_for, completed, archived_at, project_id, pomodoro_work_minutes",
      )
      .eq("user_id", userId)
      .eq("completed", false)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(3);

    if (openLoopRows.error) {
      throw openLoopRows.error;
    }

    const projectIds = Array.from(
      new Set(
        (openLoopRows.data ?? [])
          .map((row) => row.project_id)
          .filter((projectId): projectId is string => typeof projectId === "string"),
      ),
    );

    const projectNameById = new Map<string, string>();
    if (projectIds.length > 0) {
      const projectRows = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", userId)
        .in("id", projectIds);

      if (projectRows.error) {
        throw projectRows.error;
      }

      for (const project of projectRows.data ?? []) {
        projectNameById.set(project.id, project.name);
      }
    }

    const activeDays = trends.points.filter((point) => point.focus_minutes > 0).length;
    const nextUp = queue[0] ?? null;
    const queueCount = queue.length;
    const narrativeItems = [
      ...buildSessionNarrativeItems(sessions, timeZone),
      ...(activeSession
        ? [
            {
              id: `${activeSession.id}-current`,
              timeLabel: formatTimeLabel(activeSession.started_at, timeZone),
              eyebrow:
                activeSession.pomodoro_phase != null
                  ? `Current - ${activeSession.pomodoro_phase.replace("_", " ")}`
                  : "Current - Focus",
              title: activeSession.task_title ?? "Deep Work in Progress",
              detail:
                activeSession.pomodoro_phase != null
                  ? `Elapsed ${formatElapsedSince(activeSession.started_at) ?? "live"} in ${activeSession.pomodoro_phase.replace("_", " ")}.`
                  : `Elapsed ${formatElapsedSince(activeSession.started_at) ?? "live"} in active focus.`,
              state: "current" as const,
              href: "/focus",
            },
          ]
        : []),
      ...queue.slice(0, activeSession ? 1 : 2).map((item, index) => ({
        id: `${item.task_id}-upcoming`,
        timeLabel: `Queue position ${index + 1}`,
        eyebrow: "Upcoming - Queue",
        title: item.title,
        detail: "Ready to start from the focus queue.",
        state: "upcoming" as const,
        href: `/tasks?q=${encodeURIComponent(item.title)}`,
      })),
    ].slice(0, 5);

    return {
      success: true,
      data: {
        hero: {
          greeting: greetingForTimeZone(timeZone),
          userLabel: deriveUserLabel(userEmail, userDisplayName),
          dateLabel: formatLongDateLabel(new Date(), timeZone),
          focusLabel: `${sessions.length} session${sessions.length === 1 ? "" : "s"} logged today - ${queueCount} queued next`,
        },
        execution: {
          points: trends.points,
          metricLabels: {
            totalFlow: formatDurationLabel(workTotals.todaySeconds),
            completionRate: formatPercentLabel(summary.kpis.completionRate),
            onTimeRate: formatPercentLabel(summary.kpis.onTimeRate),
          },
        },
        performance: {
          activeDays,
          totalDays: trends.points.length,
          focusTodayLabel: formatDurationLabel(workTotals.todaySeconds),
          completedToday: summary.kpis.completed,
          onTimeRateLabel: formatPercentLabel(summary.kpis.onTimeRate),
          title: "Last 7 days",
          description: `${activeDays} of ${trends.points.length} days included real focus time.`,
          detail: `${summary.kpis.completed} task${summary.kpis.completed === 1 ? "" : "s"} completed today with ${formatPercentLabel(summary.kpis.onTimeRate)} on-time completion.`,
        },
        openLoops: {
          items: (openLoopRows.data ?? []).map((task) => ({
            id: task.id,
            title: task.title,
            scheduled_for: task.scheduled_for,
            completed: task.completed,
            projectName: task.project_id
              ? projectNameById.get(task.project_id) ?? null
              : null,
            metaLabel: metaLabelForTask({
              scheduled_for: task.scheduled_for,
              projectName: task.project_id
                ? projectNameById.get(task.project_id) ?? null
                : null,
            }),
            chipLabel: chipLabelForTask(task),
            href: `/tasks?q=${encodeURIComponent(task.title)}`,
          })),
        },
        narrative: {
          items: narrativeItems,
        },
        floatingRail: {
          active: Boolean(activeSession),
          statusLabel: activeSession ? "Focus running" : "No active focus session",
          timerLabel: activeSession ? formatElapsedSince(activeSession.started_at) : null,
          taskLabel: activeSession?.task_title ?? nextUp?.title ?? null,
          phaseLabel: activeSession?.pomodoro_phase ?? null,
          startedAt: activeSession?.started_at ?? null,
          primaryHref: activeSession ? "/focus?manual=1" : "/focus",
          secondaryHref: "/tasks",
          tertiaryHref: "/focus",
          primaryLabel: activeSession ? "Log Entry" : "Quick Start",
        },
      },
    };
  } catch (error) {
    logServerError({
      scope: "services.dashboard.getDashboardOptimizedScreenForUser",
      userId,
      error,
    });
    return { success: false, error: ERROR_SUMMARY };
  }
}
