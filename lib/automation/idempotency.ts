import "server-only";

type IdempotencyEntry<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const store = new Map<string, IdempotencyEntry<unknown>>();

function purgeExpired(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function getIdempotencyKey(request: Request) {
  const value = request.headers.get("Idempotency-Key");
  if (!value) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function runIdempotent<T>(
  scope: string,
  ownerId: string,
  key: string,
  handler: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  purgeExpired(now);

  const cacheKey = `${scope}:${ownerId}:${key}`;
  const existing = store.get(cacheKey) as IdempotencyEntry<T> | undefined;

  if (existing) {
    if (existing.value !== undefined) {
      return existing.value;
    }

    if (existing.promise) {
      return existing.promise;
    }
  }

  const promise = handler();
  store.set(cacheKey, {
    expiresAt: now + DAY_MS,
    promise,
  });

  try {
    const value = await promise;
    store.set(cacheKey, {
      expiresAt: now + DAY_MS,
      value,
    });
    return value;
  } catch (error) {
    store.delete(cacheKey);
    throw error;
  }
}
