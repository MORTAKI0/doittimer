"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/logging/logServerError";

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

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TASK_LIST_LIMIT = 8;
const QUEUE_LIST_LIMIT = 8;

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

  for (let i = 0; i < 4; i += 1) {
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

function getRangeBounds(input: GetDashboardSummaryInput, tz: string): DateRange {
  const now = new Date();
  const today = dateInTimezone(now, tz);

  if (input.range === "today") {
    const from = zonedMidnightToUtc(today, tz);
    const to = zonedMidnightToUtc(addDays(today, 1), tz);
    return { from, to, label: "Today" };
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

function localDateFromIso(isoString: string, tz: string): string {
  return localDateToISO(dateInTimezone(new Date(isoString), tz));
}

function normalizeTaskLiteRow(row: {
  id: string;
  title: string;
  scheduled_for: string | null;
  completed: boolean;
  archived_at: string | null;
}): TaskLite {
  return {
    id: row.id,
    title: row.title,
    scheduled_for: row.scheduled_for,
    completed: row.completed,
    archived_at: row.archived_at,
  };
}

async function countTasksInRange(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  field: "created_at" | "completed_at" | "archived_at",
  fromISO: string,
  toISO: string,
): Promise<number> {
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

export async function getDashboardSummary(
  input: GetDashboardSummaryInput,
): Promise<DashboardSummary> {
  const safeInput: GetDashboardSummaryInput = {
    range: input.range,
    from: input.from,
    to: input.to,
  };

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be signed in.");
  }

  const userId = userData.user.id;

  try {
    const { data: settingsRow, error: settingsError } = await supabase
      .from("user_settings")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    const tz = isValidTimezone(settingsRow?.timezone) ? settingsRow.timezone : "UTC";
    const selectedRange = getRangeBounds(safeInput, tz);
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

    const onTimeDenominator = onTimeDenominatorCount ?? 0;

    let onTimeNumerator = 0;
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

      onTimeNumerator = (onTimeRows ?? []).reduce((total, row) => {
        if (!row.completed_at || !row.scheduled_for) return total;
        const completedDate = localDateFromIso(row.completed_at, tz);
        return completedDate <= row.scheduled_for ? total + 1 : total;
      }, 0);
    }

    const onTimeRate = toRate(onTimeNumerator, onTimeDenominator);

    const today = dateInTimezone(new Date(), tz);
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
          return data ?? [];
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
          return data ?? [];
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
      range: {
        fromISO,
        toISO,
        tz,
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
    };
  } catch (error) {
    logServerError({
      scope: "actions.dashboard.getDashboardSummary",
      userId,
      error,
      context: {
        range: safeInput.range,
        from: safeInput.from ?? null,
        to: safeInput.to ?? null,
      },
    });
    throw new Error("Unable to load dashboard.");
  }
}