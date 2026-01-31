import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getNextUpTask } from "@/lib/queue/nextUp";

const queue = [
  { task_id: "a", title: "Task A", archived_at: null },
  { task_id: "b", title: "Task B", archived_at: null },
  { task_id: "c", title: "Task C", archived_at: null },
];

describe("next up selection", () => {
  it("picks first item when no active task", () => {
    const next = getNextUpTask(queue, null);
    assert.equal(next?.task_id, "a");
  });

  it("skips active task when it is first", () => {
    const next = getNextUpTask(queue, "a");
    assert.equal(next?.task_id, "b");
  });

  it("falls back to first when active task not in queue", () => {
    const next = getNextUpTask(queue, "z");
    assert.equal(next?.task_id, "a");
  });
});
