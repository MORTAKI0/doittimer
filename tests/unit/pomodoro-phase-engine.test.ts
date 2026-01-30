import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  adjustPhaseStartForResume,
  computeElapsedSeconds,
  getNextPhase,
} from "@/lib/pomodoro/phaseEngine";

describe("pomodoro phase transitions", () => {
  it("advances work to short break when long break is not due", () => {
    const result = getNextPhase("work", 0, 4);
    assert.equal(result.nextPhase, "short_break");
    assert.equal(result.nextCycleCount, 1);
  });

  it("advances work to long break on longEvery boundary", () => {
    const result = getNextPhase("work", 3, 4);
    assert.equal(result.nextPhase, "long_break");
    assert.equal(result.nextCycleCount, 4);
  });

  it("advances break phases back to work without changing cycle count", () => {
    const shortResult = getNextPhase("short_break", 2, 4);
    assert.equal(shortResult.nextPhase, "work");
    assert.equal(shortResult.nextCycleCount, 2);

    const longResult = getNextPhase("long_break", 2, 4);
    assert.equal(longResult.nextPhase, "work");
    assert.equal(longResult.nextCycleCount, 2);
  });
});

describe("pause/resume time accounting", () => {
  it("freezes elapsed time while paused", () => {
    const startedAtMs = 0;
    const pausedAtMs = 10_000;
    const nowMs = 20_000;
    const elapsed = computeElapsedSeconds(startedAtMs, nowMs, pausedAtMs);
    assert.equal(elapsed, 10);
  });

  it("shifts phase start on resume to exclude paused duration", () => {
    const startedAtMs = 0;
    const pausedAtMs = 10_000;
    const resumeAtMs = 20_000;
    const adjustedStart = adjustPhaseStartForResume(startedAtMs, pausedAtMs, resumeAtMs);
    assert.equal(adjustedStart, 10_000);

    const elapsedAfterResume = computeElapsedSeconds(adjustedStart, 25_000, null);
    assert.equal(elapsedAfterResume, 15);
  });
});
