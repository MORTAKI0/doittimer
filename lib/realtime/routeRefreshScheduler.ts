type RefreshFn = () => void;

type SchedulerOptions = {
  debounceMs?: number;
  minIntervalMs?: number;
  maxWaitMs?: number;
  reasonDedupeMs?: number;
};

type ScheduleRefreshArgs = SchedulerOptions & {
  routeKey: string;
  reason: string;
  refresh: RefreshFn;
};

type RouteState = {
  refresh: RefreshFn;
  timerId: number | null;
  firstPendingAt: number | null;
  pendingReason: string | null;
  lastRefreshAt: number;
  recentReasons: Map<string, number>;
};

const DEFAULTS = {
  debounceMs: 250,
  minIntervalMs: 700,
  maxWaitMs: 1200,
  reasonDedupeMs: 300,
} as const;

const routeState = new Map<string, RouteState>();

function getState(routeKey: string, refresh: RefreshFn): RouteState {
  const existing = routeState.get(routeKey);
  if (existing) {
    existing.refresh = refresh;
    return existing;
  }
  const created: RouteState = {
    refresh,
    timerId: null,
    firstPendingAt: null,
    pendingReason: null,
    lastRefreshAt: 0,
    recentReasons: new Map(),
  };
  routeState.set(routeKey, created);
  return created;
}

function cleanupOldReasons(state: RouteState, now: number, reasonDedupeMs: number) {
  for (const [reason, timestamp] of state.recentReasons.entries()) {
    if (now - timestamp > reasonDedupeMs) {
      state.recentReasons.delete(reason);
    }
  }
}

function runRefresh(routeKey: string, options: Required<SchedulerOptions>) {
  const state = routeState.get(routeKey);
  if (!state) return;

  const now = Date.now();
  const elapsedSinceLast = now - state.lastRefreshAt;
  if (elapsedSinceLast < options.minIntervalMs) {
    const waitMs = options.minIntervalMs - elapsedSinceLast;
    state.timerId = window.setTimeout(() => {
      runRefresh(routeKey, options);
    }, waitMs);
    return;
  }

  state.timerId = null;
  state.firstPendingAt = null;
  state.pendingReason = null;
  state.lastRefreshAt = now;
  state.refresh();
}

export function scheduleRouteRefresh({
  routeKey,
  reason,
  refresh,
  debounceMs = DEFAULTS.debounceMs,
  minIntervalMs = DEFAULTS.minIntervalMs,
  maxWaitMs = DEFAULTS.maxWaitMs,
  reasonDedupeMs = DEFAULTS.reasonDedupeMs,
}: ScheduleRefreshArgs) {
  const state = getState(routeKey, refresh);
  const now = Date.now();
  const options = { debounceMs, minIntervalMs, maxWaitMs, reasonDedupeMs };

  cleanupOldReasons(state, now, reasonDedupeMs);
  const previousTimestamp = state.recentReasons.get(reason);
  if (typeof previousTimestamp === "number" && now - previousTimestamp < reasonDedupeMs) {
    return;
  }
  state.recentReasons.set(reason, now);
  state.pendingReason = reason;

  if (state.firstPendingAt === null) {
    state.firstPendingAt = now;
  }

  if (state.timerId !== null) {
    window.clearTimeout(state.timerId);
  }

  const waitedMs = now - state.firstPendingAt;
  const remainingUntilMaxWait = Math.max(0, maxWaitMs - waitedMs);
  const waitMs = Math.min(debounceMs, remainingUntilMaxWait);

  state.timerId = window.setTimeout(() => {
    runRefresh(routeKey, options);
  }, waitMs);
}
