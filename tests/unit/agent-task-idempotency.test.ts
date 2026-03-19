import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runIdempotent } from "../../lib/automation/idempotency";

describe("automation task idempotency", () => {
  it("returns the same completed result for duplicate keys", async () => {
    let runs = 0;

    const first = await runIdempotent("agent.tasks.create", "user-1", "key-1", async () => {
      runs += 1;
      return { id: "task-1" };
    });

    const second = await runIdempotent("agent.tasks.create", "user-1", "key-1", async () => {
      runs += 1;
      return { id: "task-2" };
    });

    assert.deepEqual(first, { id: "task-1" });
    assert.deepEqual(second, { id: "task-1" });
    assert.equal(runs, 1);
  });
});
