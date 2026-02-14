type SeenEntry = {
  expiresAt: number;
};

const DEFAULT_TTL_MS = 1500;
const MAX_ENTRIES = 500;
const seen = new Map<string, SeenEntry>();

function cleanup(now: number) {
  for (const [key, value] of seen.entries()) {
    if (value.expiresAt <= now) {
      seen.delete(key);
    }
  }
}

function enforceMaxSize() {
  if (seen.size <= MAX_ENTRIES) return;
  const overflow = seen.size - MAX_ENTRIES;
  const keys = seen.keys();
  for (let index = 0; index < overflow; index += 1) {
    const key = keys.next().value;
    if (!key) break;
    seen.delete(key);
  }
}

export function consumeRecentEvent(eventKey: string, ttlMs: number = DEFAULT_TTL_MS) {
  const now = Date.now();
  cleanup(now);

  const existing = seen.get(eventKey);
  if (existing && existing.expiresAt > now) {
    return false;
  }

  seen.set(eventKey, { expiresAt: now + ttlMs });
  enforceMaxSize();
  return true;
}
