export type PomodoroPhase = "work" | "short_break" | "long_break";

type EffectivePomodoro = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
};

export function getPhaseDurationSeconds(
  phase: PomodoroPhase,
  settings: EffectivePomodoro,
): number {
  switch (phase) {
    case "short_break":
      return Math.max(0, settings.shortBreakMinutes) * 60;
    case "long_break":
      return Math.max(0, settings.longBreakMinutes) * 60;
    case "work":
    default:
      return Math.max(0, settings.workMinutes) * 60;
  }
}

export function getNextPhase(
  currentPhase: PomodoroPhase,
  cycleCount: number,
  longEvery: number,
): { nextPhase: PomodoroPhase; nextCycleCount: number } {
  if (currentPhase !== "work") {
    return { nextPhase: "work", nextCycleCount: cycleCount };
  }

  const safeLongEvery = Number.isFinite(longEvery) && longEvery > 0 ? longEvery : 4;
  const nextCycleCount = cycleCount + 1;
  const nextPhase =
    nextCycleCount % safeLongEvery === 0 ? "long_break" : "short_break";

  return { nextPhase, nextCycleCount };
}

export function computeElapsedSeconds(
  phaseStartedAtMs: number,
  nowMs: number,
  pausedAtMs?: number | null,
): number {
  const effectiveNow = typeof pausedAtMs === "number" ? pausedAtMs : nowMs;
  if (!Number.isFinite(phaseStartedAtMs) || !Number.isFinite(effectiveNow)) return 0;
  return Math.max(0, Math.floor((effectiveNow - phaseStartedAtMs) / 1000));
}

export function adjustPhaseStartForResume(
  phaseStartedAtMs: number,
  pausedAtMs: number | null,
  nowMs: number,
): number {
  if (!Number.isFinite(phaseStartedAtMs) || !Number.isFinite(nowMs)) return nowMs;
  if (typeof pausedAtMs !== "number" || !Number.isFinite(pausedAtMs)) {
    return phaseStartedAtMs;
  }
  return phaseStartedAtMs + (nowMs - pausedAtMs);
}
