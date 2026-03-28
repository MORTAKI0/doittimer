import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildYearFocusHeatmap } from "@/lib/dashboard/heatmap";
import {
  buildDenseTrendPoints,
  buildLocalDaySeries,
  normalizeDashboardTrendDays,
} from "@/lib/dashboard/trends";

describe("dashboard trend helpers", () => {
  it("normalizes supported day ranges without breaking 7 and 30 day callers", () => {
    assert.equal(normalizeDashboardTrendDays(7), 7);
    assert.equal(normalizeDashboardTrendDays(30), 30);
    assert.equal(normalizeDashboardTrendDays(365), 365);
    assert.equal(normalizeDashboardTrendDays(999), 7);
  });

  it("builds dense rows with legacy fields and aliases for a 365 day range", () => {
    const timeZone = "UTC";
    const daySeries = buildLocalDaySeries(365, timeZone, new Date("2026-03-28T12:00:00.000Z"));
    const points = buildDenseTrendPoints({
      daySeries,
      sessions: [
        {
          started_at: "2026-03-28T08:00:00.000Z",
          duration_seconds: 2_700,
        },
      ],
      tasks: [],
      timeZone,
    });

    assert.equal(points.length, 365);
    assert.equal(points.at(-1)?.day, "2026-03-28");
    assert.equal(points.at(-1)?.date, "2026-03-28");
    assert.equal(points.at(-1)?.focus_minutes, 45);
    assert.equal(points.at(-1)?.minutesTracked, 45);
  });

  it("groups sessions and tasks by the user's local midnight instead of UTC midnight", () => {
    const timeZone = "America/Los_Angeles";
    const daySeries = buildLocalDaySeries(7, timeZone, new Date("2026-01-03T20:00:00.000Z"));
    const points = buildDenseTrendPoints({
      daySeries,
      sessions: [
        {
          started_at: "2026-01-02T07:30:00.000Z",
          duration_seconds: 1_800,
        },
        {
          started_at: "2026-01-02T20:00:00.000Z",
          duration_seconds: 3_600,
        },
      ],
      tasks: [
        {
          completed_at: "2026-01-02T07:30:00.000Z",
          scheduled_for: "2026-01-01",
        },
      ],
      timeZone,
    });

    const jan1 = points.find((point) => point.day === "2026-01-01");
    const jan2 = points.find((point) => point.day === "2026-01-02");

    assert.equal(jan1?.focus_minutes, 30);
    assert.equal(jan1?.minutesTracked, 30);
    assert.equal(jan1?.completed_tasks, 1);
    assert.equal(jan1?.on_time_rate, 1);
    assert.equal(jan2?.focus_minutes, 60);
  });

  it("keeps DST boundary events on the correct local day", () => {
    const timeZone = "America/New_York";
    const daySeries = buildLocalDaySeries(7, timeZone, new Date("2026-03-09T16:00:00.000Z"));
    const points = buildDenseTrendPoints({
      daySeries,
      sessions: [
        {
          started_at: "2026-03-08T04:30:00.000Z",
          duration_seconds: 1_200,
        },
        {
          started_at: "2026-03-08T07:30:00.000Z",
          duration_seconds: 2_400,
        },
      ],
      tasks: [],
      timeZone,
    });

    const march7 = points.find((point) => point.day === "2026-03-07");
    const march8 = points.find((point) => point.day === "2026-03-08");

    assert.equal(march7?.focus_minutes, 20);
    assert.equal(march8?.focus_minutes, 40);
  });
});

describe("year focus heatmap adapter", () => {
  const yearDaySeries = buildLocalDaySeries(365, "UTC", new Date("2026-03-28T12:00:00.000Z"));

  it("renders a full 53 by 7 grid and keeps zero-data days visible", () => {
    const points = buildDenseTrendPoints({
      daySeries: yearDaySeries,
      sessions: [],
      tasks: [],
      timeZone: "UTC",
    });
    const heatmap = buildYearFocusHeatmap(points);
    const dayCells = heatmap.cells.filter((cell) => cell.kind === "day");

    assert.equal(heatmap.columns, 53);
    assert.equal(heatmap.rows, 7);
    assert.equal(dayCells.length, 365);
    assert.equal(heatmap.maxMinutes, 0);
    assert.ok(dayCells.every((cell) => cell.bucket === 0));
    assert.equal(dayCells[0]?.tooltipLabel.includes("0 min tracked"), true);
  });

  it("keeps sparse first and last visible weeks aligned with padding cells", () => {
    const sparsePoints = buildDenseTrendPoints({
      daySeries: yearDaySeries,
      sessions: [
        {
          started_at: `${yearDaySeries[0]}T12:00:00.000Z`,
          duration_seconds: 600,
        },
        {
          started_at: `${yearDaySeries.at(-1)}T12:00:00.000Z`,
          duration_seconds: 1_200,
        },
      ],
      tasks: [],
      timeZone: "UTC",
    });
    const heatmap = buildYearFocusHeatmap(sparsePoints);
    const firstRealIndex = heatmap.cells.findIndex(
      (cell) => cell.kind === "day" && cell.date === yearDaySeries[0],
    );
    const lastRealIndex = heatmap.cells.findIndex(
      (cell) => cell.kind === "day" && cell.date === yearDaySeries.at(-1),
    );

    assert.ok(firstRealIndex > 0);
    assert.ok(lastRealIndex > firstRealIndex);
    assert.ok(lastRealIndex < heatmap.cells.length - 1);
  });

  it("assigns relative intensity buckets for mixed data", () => {
    const points = buildDenseTrendPoints({
      daySeries: ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"],
      sessions: [
        { started_at: "2026-01-06T12:00:00.000Z", duration_seconds: 600 },
        { started_at: "2026-01-07T12:00:00.000Z", duration_seconds: 3_000 },
        { started_at: "2026-01-08T12:00:00.000Z", duration_seconds: 6_000 },
      ],
      tasks: [],
      timeZone: "UTC",
    });
    const heatmap = buildYearFocusHeatmap(points);

    const byDate = new Map(
      heatmap.cells
        .filter((cell) => cell.kind === "day")
        .map((cell) => [cell.date, cell.bucket]),
    );

    assert.equal(byDate.get("2026-01-05"), 0);
    assert.equal(byDate.get("2026-01-06"), 1);
    assert.equal(byDate.get("2026-01-07"), 2);
    assert.equal(byDate.get("2026-01-08"), 4);
  });

  it("places month labels correctly across year boundaries", () => {
    const points = buildDenseTrendPoints({
      daySeries: yearDaySeries,
      sessions: [],
      tasks: [],
      timeZone: "UTC",
    });
    const heatmap = buildYearFocusHeatmap(points);
    const decLabel = heatmap.monthLabels.find((label) => label.label === "Dec");
    const janLabel = heatmap.monthLabels.find((label) => label.label === "Jan");

    assert.ok(decLabel);
    assert.ok(janLabel);
    assert.ok((decLabel?.column ?? 0) < (janLabel?.column ?? 0));
    assert.equal(heatmap.legend.length, 5);
  });
});
