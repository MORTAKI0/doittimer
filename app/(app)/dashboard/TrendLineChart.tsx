import type { TrendPoint } from "@/app/actions/dashboardTrends";

type TrendLineChartProps = {
  title: string;
  points: TrendPoint[];
  valueSelector: (point: TrendPoint) => number | null;
  valueFormatter: (value: number | null) => string;
  emptyLabel?: string;
};

type ChartPoint = {
  x: number;
  y: number;
  value: number | null;
  day: string;
};

const WIDTH = 640;
const HEIGHT = 220;
const MARGIN_TOP = 16;
const MARGIN_RIGHT = 14;
const MARGIN_BOTTOM = 38;
const MARGIN_LEFT = 44;

function tickIndices(length: number): number[] {
  if (length <= 1) return [0];

  const target = length <= 7 ? length : 5;
  const output = new Set<number>([0, length - 1]);

  for (let i = 1; i < target - 1; i += 1) {
    const index = Math.round((i * (length - 1)) / (target - 1));
    output.add(index);
  }

  return Array.from(output).sort((a, b) => a - b);
}

function shortDayLabel(day: string): string {
  const month = day.slice(5, 7);
  const date = day.slice(8, 10);
  return `${month}/${date}`;
}

function buildSegments(points: ChartPoint[]): string[] {
  const segments: string[] = [];
  let current: string[] = [];

  for (const point of points) {
    if (point.value == null) {
      if (current.length >= 2) {
        segments.push(current.join(" "));
      }
      current = [];
      continue;
    }

    current.push(`${point.x},${point.y}`);
  }

  if (current.length >= 2) {
    segments.push(current.join(" "));
  }

  return segments;
}

export function TrendLineChart({
  title,
  points,
  valueSelector,
  valueFormatter,
  emptyLabel = "No data yet",
}: TrendLineChartProps) {
  const values = points.map((point) => valueSelector(point));
  const nonNullValues = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  const maxValue = Math.max(1, ...nonNullValues, 0);

  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const chartPoints: ChartPoint[] = points.map((point, index) => {
    const value = valueSelector(point);
    const ratio = value == null ? null : value / maxValue;
    const y =
      ratio == null
        ? MARGIN_TOP + plotHeight
        : MARGIN_TOP + plotHeight - ratio * plotHeight;

    return {
      x: MARGIN_LEFT + index * xStep,
      y,
      value,
      day: point.day,
    };
  });

  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => ({
    value: maxValue * ratio,
    y: MARGIN_TOP + plotHeight - plotHeight * ratio,
  }));

  const xTickIndexes = tickIndices(points.length);
  const segments = buildSegments(chartPoints);
  const hasAnyData = nonNullValues.length > 0;

  return (
    <article className="border-border bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">
          {valueFormatter(values[values.length - 1] ?? null)} today
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-52 w-full"
        role="img"
        aria-label={title}
      >
        <rect
          x={MARGIN_LEFT}
          y={MARGIN_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          stroke="var(--color-border)"
          strokeWidth="1"
          rx="8"
        />

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={MARGIN_LEFT}
              y1={tick.y}
              x2={WIDTH - MARGIN_RIGHT}
              y2={tick.y}
              stroke="var(--color-border)"
              strokeOpacity="0.5"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={MARGIN_LEFT - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {valueFormatter(tick.value)}
            </text>
          </g>
        ))}

        {xTickIndexes.map((index) => {
          const point = chartPoints[index];
          return (
            <g key={point.day}>
              <line
                x1={point.x}
                y1={MARGIN_TOP + plotHeight}
                x2={point.x}
                y2={MARGIN_TOP + plotHeight + 4}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text
                x={point.x}
                y={HEIGHT - 12}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {shortDayLabel(point.day)}
              </text>
            </g>
          );
        })}

        {segments.map((segment, index) => (
          <polyline
            key={`${title}-segment-${index}`}
            points={segment}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-emerald-600"
          />
        ))}

        {chartPoints.map((point) => {
          if (point.value == null) return null;
          return (
            <circle
              key={`${title}-dot-${point.day}`}
              cx={point.x}
              cy={point.y}
              r="2.5"
              fill="currentColor"
              className="text-emerald-600"
              opacity="0.9"
            />
          );
        })}
      </svg>

      {!hasAnyData ? (
        <p className="text-muted-foreground mt-2 text-xs">{emptyLabel}</p>
      ) : null}
    </article>
  );
}
