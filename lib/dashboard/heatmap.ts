import type { DenseTrendPoint } from "@/lib/dashboard/trends";

export type HeatmapLegendSample = {
  bucket: number;
  opacity: number;
};

export type HeatmapMonthLabel = {
  key: string;
  label: string;
  column: number;
};

export type HeatmapCell =
  | {
      key: string;
      column: number;
      row: number;
      kind: "padding";
    }
  | {
      key: string;
      column: number;
      row: number;
      kind: "day";
      date: string;
      minutesTracked: number;
      bucket: number;
      opacity: number;
      tooltipLabel: string;
    };

export type YearFocusHeatmap = {
  columns: number;
  rows: number;
  maxMinutes: number;
  cells: HeatmapCell[];
  monthLabels: HeatmapMonthLabel[];
  weekdayLabels: Array<{ row: number; label: "M" | "W" | "F" }>;
  legend: HeatmapLegendSample[];
};

const CELL_OPACITIES = [0.12, 0.32, 0.52, 0.74, 0.95] as const;
const ROWS = 7;
const MONO_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

function parseUtcDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T12:00:00.000Z`);
}

function weekdayRow(dateOnly: string): number {
  const day = parseUtcDate(dateOnly).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function bucketForMinutes(minutesTracked: number, maxMinutes: number): number {
  if (minutesTracked <= 0 || maxMinutes <= 0) {
    return 0;
  }

  return Math.min(4, Math.max(1, Math.ceil((minutesTracked / maxMinutes) * 4)));
}

function formatTooltipLabel(date: string, minutesTracked: number) {
  const minutesLabel = `${minutesTracked} min tracked`;
  const dateLabel = MONO_DATE_FORMATTER.format(parseUtcDate(date));
  return `${minutesLabel} — ${dateLabel}`;
}

export function buildYearFocusHeatmap(points: DenseTrendPoint[]): YearFocusHeatmap {
  if (points.length === 0) {
    return {
      columns: 53,
      rows: ROWS,
      maxMinutes: 0,
      cells: Array.from({ length: 53 * ROWS }, (_, index) => ({
        key: `padding-${index}`,
        column: Math.floor(index / ROWS),
        row: index % ROWS,
        kind: "padding" as const,
      })),
      monthLabels: [],
      weekdayLabels: [
        { row: 0, label: "M" as const },
        { row: 2, label: "W" as const },
        { row: 4, label: "F" as const },
      ],
      legend: CELL_OPACITIES.map((opacity, bucket) => ({ bucket, opacity })),
    };
  }

  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  const leadingPadding = weekdayRow(firstDate);
  const trailingPadding = ROWS - 1 - weekdayRow(lastDate);
  const totalSlots = leadingPadding + points.length + trailingPadding;
  const columns = Math.ceil(totalSlots / ROWS);
  const maxMinutes = points.reduce(
    (currentMax, point) => Math.max(currentMax, point.minutesTracked),
    0,
  );

  const monthLabels: HeatmapMonthLabel[] = [];
  const seenMonths = new Set<string>();

  points.forEach((point, pointIndex) => {
    const slotIndex = leadingPadding + pointIndex;
    const column = Math.floor(slotIndex / ROWS);
    const monthKey = point.date.slice(0, 7);

    if (seenMonths.has(monthKey)) {
      return;
    }

    seenMonths.add(monthKey);
    monthLabels.push({
      key: monthKey,
      label: MONTH_LABEL_FORMATTER.format(parseUtcDate(point.date)),
      column,
    });
  });

  const cells: HeatmapCell[] = [];
  for (let slotIndex = 0; slotIndex < columns * ROWS; slotIndex += 1) {
    const column = Math.floor(slotIndex / ROWS);
    const row = slotIndex % ROWS;
    const pointIndex = slotIndex - leadingPadding;

    if (pointIndex < 0 || pointIndex >= points.length) {
      cells.push({
        key: `padding-${column}-${row}`,
        column,
        row,
        kind: "padding",
      });
      continue;
    }

    const point = points[pointIndex];
    const bucket = bucketForMinutes(point.minutesTracked, maxMinutes);
    cells.push({
      key: point.date,
      column,
      row,
      kind: "day",
      date: point.date,
      minutesTracked: point.minutesTracked,
      bucket,
      opacity: CELL_OPACITIES[bucket],
      tooltipLabel: formatTooltipLabel(point.date, point.minutesTracked),
    });
  }

  return {
    columns,
    rows: ROWS,
    maxMinutes,
    cells,
    monthLabels,
    weekdayLabels: [
      { row: 0, label: "M" },
      { row: 2, label: "W" },
      { row: 4, label: "F" },
    ],
    legend: CELL_OPACITIES.map((opacity, bucket) => ({ bucket, opacity })),
  };
}
