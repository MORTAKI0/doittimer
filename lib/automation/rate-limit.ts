import "server-only";

type RateLimitConfig = {
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function purgeExpired(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkAutomationRateLimit(ownerId: string, config: RateLimitConfig) {
  const now = Date.now();
  purgeExpired(now);

  const key = `${config.scope}:${ownerId}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      ok: true as const,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (existing.count >= config.limit) {
    return {
      ok: false as const,
      retryAfterMs: Math.max(0, existing.resetAt - now),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    ok: true as const,
    remaining: Math.max(0, config.limit - existing.count),
    resetAt: existing.resetAt,
  };
}
