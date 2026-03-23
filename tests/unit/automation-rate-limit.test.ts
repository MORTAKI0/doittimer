import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkAutomationRateLimit } from "../../lib/automation/rate-limit.ts";

describe("automation rate limiting", () => {
  it("enforces a scoped per-token limit", () => {
    const config = {
      scope: `agent.notion.sync.test.${Date.now()}`,
      limit: 5,
      windowMs: 60_000,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = checkAutomationRateLimit("token-1", config);
      assert.equal(result.ok, true);
    }

    const blocked = checkAutomationRateLimit("token-1", config);

    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterMs > 0);
  });
});
