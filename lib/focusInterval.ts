export const FOCUS_INTERVAL_STORAGE_KEY = "doittimer.focusIntervalMinutes";
export const DEFAULT_FOCUS_INTERVAL_MINUTES = 25;
export const FOCUS_INTERVAL_MIN = 1;
export const FOCUS_INTERVAL_MAX = 180;

export function normalizeFocusIntervalMinutes(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FOCUS_INTERVAL_MINUTES;
  }
  const rounded = Math.round(parsed);
  if (rounded < FOCUS_INTERVAL_MIN) return FOCUS_INTERVAL_MIN;
  if (rounded > FOCUS_INTERVAL_MAX) return FOCUS_INTERVAL_MAX;
  return rounded;
}
