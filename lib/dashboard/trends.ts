export type SupportedTrendDays = 7 | 30 | 365;

export type TrendSourceSessionRow = {
  started_at: string;
  duration_seconds: number | string | null;
};

export type TrendSourceTaskRow = {
  completed_at: string | null;
  scheduled_for: string | null;
};

export type DenseTrendPoint = {
  day: string;
  date: string;
  focus_minutes: number;
  minutesTracked: number;
  completed_tasks: number;
  on_time_rate: number | null;
};

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

type DateParts = LocalDate & {
  hour: number;
  minute: number;
  second: number;
};

const DAY_MS = 86_400_000;

export function normalizeDashboardTrendDays(days: number): SupportedTrendDays {
  if (days === 365) return 365;
  if (days === 30) return 30;
  return 7;
}

function addDays(date: LocalDate, days: number): LocalDate {
  const sourceMs = Date.UTC(date.year, date.month - 1, date.day);
  const shifted = new Date(sourceMs + days * DAY_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function datePartsAt(instant: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const values: Record<string, number> = {};

  for (const part of formatter.formatToParts(instant)) {
    if (part.type === "literal" || part.type in values) {
      continue;
    }

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

function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = datePartsAt(instant, timeZone);
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

export function dateInTimezone(instant: Date, timeZone: string): LocalDate {
  const parts = datePartsAt(instant, timeZone);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function localDateToISO(date: LocalDate): string {
  const yyyy = String(date.year).padStart(4, "0");
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateOnly(value: string): LocalDate {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function zonedMidnightToUtc(date: LocalDate, timeZone: string): Date {
  const targetUtc = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0);
  let guess = targetUtc;

  for (let index = 0; index < 4; index += 1) {
    const offset = offsetMsAt(new Date(guess), timeZone);
    const next = targetUtc - offset;
    if (next === guess) {
      break;
    }
    guess = next;
  }

  return new Date(guess);
}

export function buildLocalDaySeries(
  days: SupportedTrendDays,
  timeZone: string,
  now: Date = new Date(),
): string[] {
  const today = dateInTimezone(now, timeZone);
  const start = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, index) =>
    localDateToISO(addDays(start, index)),
  );
}

export function getLocalDaySeriesUtcRange(daySeries: string[], timeZone: string) {
  const firstDay = daySeries[0];
  const lastDay = daySeries[daySeries.length - 1];
  const from = zonedMidnightToUtc(parseDateOnly(firstDay), timeZone).toISOString();
  const to = zonedMidnightToUtc(addDays(parseDateOnly(lastDay), 1), timeZone).toISOString();
  return { from, to };
}

function toSafeSeconds(value: number | string | null): number {
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

function localDateFromIso(isoString: string, timeZone: string): string {
  return localDateToISO(dateInTimezone(new Date(isoString), timeZone));
}

export function buildDenseTrendPoints(input: {
  daySeries: string[];
  sessions: TrendSourceSessionRow[];
  tasks: TrendSourceTaskRow[];
  timeZone: string;
}): DenseTrendPoint[] {
  const focusSecondsByDay = new Map<string, number>();

  for (const row of input.sessions) {
    const day = localDateFromIso(row.started_at, input.timeZone);
    focusSecondsByDay.set(
      day,
      (focusSecondsByDay.get(day) ?? 0) + toSafeSeconds(row.duration_seconds),
    );
  }

  const completedByDay = new Map<
    string,
    { completed: number; scheduledCompleted: number; onTimeCompleted: number }
  >();

  for (const row of input.tasks) {
    if (!row.completed_at) continue;

    const day = localDateFromIso(row.completed_at, input.timeZone);
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

  return input.daySeries.map((day) => {
    const completed = completedByDay.get(day);
    const focusMinutes = Math.floor((focusSecondsByDay.get(day) ?? 0) / 60);

    return {
      day,
      date: day,
      focus_minutes: focusMinutes,
      minutesTracked: focusMinutes,
      completed_tasks: toSafeInt(completed?.completed ?? 0),
      on_time_rate:
        completed && completed.scheduledCompleted > 0
          ? clampRate(completed.onTimeCompleted / completed.scheduledCompleted)
          : null,
    };
  });
}
