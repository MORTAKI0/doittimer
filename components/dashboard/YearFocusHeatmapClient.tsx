"use client";

import * as React from "react";

import type { HeatmapCell, YearFocusHeatmap } from "@/lib/dashboard/heatmap";

type YearFocusHeatmapClientProps = {
  heatmap: YearFocusHeatmap;
};

type TooltipState = {
  label: string;
  x: number;
  y: number;
} | null;

const GRID_STYLE = {
  gridTemplateColumns: "repeat(53, minmax(0, 1fr))",
  gridTemplateRows: "repeat(7, minmax(0, 1fr))",
  gap: "clamp(1px, 0.25vw, 3px)",
} as const;

function tooltipPositionFromEvent(event: React.MouseEvent<HTMLElement>) {
  return {
    x: event.clientX + 18,
    y: event.clientY + 18,
  };
}

function isDayCell(cell: HeatmapCell): cell is Extract<HeatmapCell, { kind: "day" }> {
  return cell.kind === "day";
}

export function YearFocusHeatmapClient({
  heatmap,
}: YearFocusHeatmapClientProps) {
  const [tooltip, setTooltip] = React.useState<TooltipState>(null);

  const handlePointerLeave = React.useCallback(() => {
    setTooltip(null);
  }, []);

  const handlePointerMove = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, cell: Extract<HeatmapCell, { kind: "day" }>) => {
      const position = tooltipPositionFromEvent(event);
      setTooltip({
        label: cell.tooltipLabel,
        ...position,
      });
    },
    [],
  );

  return (
    <div className="space-y-3" data-testid="year-focus-heatmap">
      <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-3 gap-y-2">
        <div aria-hidden="true" />
        <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[clamp(1px,0.25vw,3px)]">
          {Array.from({ length: 53 }, (_, column) => {
            const month = heatmap.monthLabels.find((item) => item.column === column);
            return (
              <div
                key={`month-${column}`}
                className="min-h-4 text-[11px] font-medium text-muted-foreground"
              >
                {month?.label ?? ""}
              </div>
            );
          })}
        </div>

        <div
          className="grid text-[12px] text-muted-foreground"
          style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", rowGap: GRID_STYLE.gap }}
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, row) => {
            const label = heatmap.weekdayLabels.find((item) => item.row === row);
            return (
              <div
                key={`weekday-${row}`}
                className="flex min-h-0 items-center justify-start font-mono leading-none"
              >
                {label?.label ?? ""}
              </div>
            );
          })}
        </div>

        <div
          className="relative"
          data-testid="year-focus-heatmap-grid"
          onMouseLeave={handlePointerLeave}
        >
          <div className="grid w-full" style={GRID_STYLE}>
            {heatmap.cells.map((cell) => {
              if (!isDayCell(cell)) {
                return (
                  <div
                    key={cell.key}
                    className="aspect-square rounded-[3px] bg-muted/35"
                    style={{
                      gridColumnStart: cell.column + 1,
                      gridRowStart: cell.row + 1,
                    }}
                    data-kind="padding"
                  />
                );
              }

              return (
                <div
                  key={cell.key}
                  className="aspect-square rounded-[3px] border border-black/0 transition-transform duration-75 hover:scale-[1.12]"
                  style={{
                    gridColumnStart: cell.column + 1,
                    gridRowStart: cell.row + 1,
                    backgroundColor: `rgb(15 110 86 / ${cell.opacity})`,
                  }}
                  data-kind="day"
                  data-date={cell.date}
                  data-testid={`year-focus-heatmap-cell-${cell.date}`}
                  onMouseMove={(event) => handlePointerMove(event, cell)}
                  onMouseEnter={(event) => handlePointerMove(event, cell)}
                />
              );
            })}
          </div>

          {tooltip ? (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-border bg-card px-2 py-1 font-mono text-[12px] text-foreground shadow-[var(--shadow-soft)]"
              style={{ left: tooltip.x, top: tooltip.y }}
              data-testid="year-focus-heatmap-tooltip"
            >
              {tooltip.label}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 font-mono text-[12px] text-muted-foreground">
        <span>Less</span>
        {heatmap.legend.map((sample) => (
          <span
            key={`legend-${sample.bucket}`}
            className="inline-flex h-3.5 w-3.5 rounded-[3px]"
            style={{ backgroundColor: `rgb(15 110 86 / ${sample.opacity})` }}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
