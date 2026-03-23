import type { TrendPoint } from "@/app/actions/dashboardTrends";

type ExecutionCompositeChartProps = {
  points: TrendPoint[];
};

const WIDTH = 640;
const HEIGHT = 276;
const MARGIN_TOP = 22;
const MARGIN_RIGHT = 18;
const MARGIN_BOTTOM = 30;
const MARGIN_LEFT = 4;

function shortDayLabel(day: string) {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" })
    .format(parsed)
    .toUpperCase();
}

function polylinePoints(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";

  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    const previous = points[index];
    const midpointX = (previous.x + current.x) / 2;
    path += ` Q ${midpointX} ${previous.y} ${current.x} ${current.y}`;
  }

  return path;
}

export function ExecutionCompositeChart({
  points,
}: ExecutionCompositeChartProps) {
  const chartPoints = points.length > 0 ? points : [];
  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const maxFocus = Math.max(1, ...chartPoints.map((point) => point.focus_minutes));
  const maxCompleted = Math.max(1, ...chartPoints.map((point) => point.completed_tasks));
  const barGap = 6;
  const barWidth =
    chartPoints.length > 0 ? plotWidth / chartPoints.length - barGap : 0;

  const linePoints = chartPoints.map((point, index) => {
    const ratio = point.completed_tasks / maxCompleted;
    const x =
      MARGIN_LEFT +
      Math.max(18, barWidth) / 2 +
      index * (Math.max(18, barWidth) + barGap);
    const y = MARGIN_TOP + plotHeight - ratio * plotHeight;

    return { x, y };
  });

  return (
    <div className="dashboard-chart-shell">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[276px] w-full"
        role="img"
        aria-label="Execution over time"
      >
        <defs>
          <linearGradient id="dashboard-chart-curve" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d7b57" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          <linearGradient id="dashboard-chart-emphasis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,108,71,0.14)" />
            <stop offset="100%" stopColor="rgba(0,108,71,0)" />
          </linearGradient>
        </defs>

        <line
          x1={0}
          y1={MARGIN_TOP + plotHeight}
          x2={WIDTH - MARGIN_RIGHT}
          y2={MARGIN_TOP + plotHeight}
          stroke="rgba(148,163,184,0.18)"
          strokeWidth="1"
        />
        {chartPoints.map((point, index) => {
          const ratio = point.focus_minutes / maxFocus;
          const barHeight = Math.max(18, ratio * plotHeight);
          const x = MARGIN_LEFT + index * (Math.max(18, barWidth) + barGap);
          const y = MARGIN_TOP + plotHeight - barHeight;
          const isEmphasis = index === Math.max(0, chartPoints.length - 4);
          const isMutedTail = index >= chartPoints.length - 2;
          const isSecondary = index === 1 || index === 2;

          return (
            <g key={point.day}>
              <rect
                x={x}
                y={y}
                width={Math.max(18, barWidth)}
                height={barHeight}
                rx="4"
                fill={
                  isMutedTail
                    ? "#f2f4f6"
                    : isEmphasis
                      ? "#18b77b"
                      : isSecondary
                        ? "#c9f2df"
                        : "#e9f7f0"
                }
                opacity={isMutedTail ? 0.58 : 1}
              />
              {isEmphasis ? (
                <rect
                  x={x}
                  y={y}
                  width={Math.max(18, barWidth)}
                  height={barHeight}
                  rx="4"
                  fill="url(#dashboard-chart-emphasis)"
                />
              ) : null}
              <text
                x={x + Math.max(18, barWidth) / 2}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {shortDayLabel(point.day)}
              </text>
            </g>
          );
        })}

        {linePoints.length >= 2 ? (
          <path
            d={smoothPath(linePoints)}
            fill="none"
            stroke="url(#dashboard-chart-curve)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {linePoints.slice(0, Math.max(0, linePoints.length - 2)).map((point, index) => (
          <circle
            key={`line-point-${index}`}
            cx={point.x}
            cy={point.y}
            r="1.65"
            fill="#0b6b4d"
          />
        ))}
      </svg>
    </div>
  );
}
