import { describe, it } from "node:test";
import assert from "node:assert/strict";

type QueueItem = { taskId: string; sortOrder: number };

function moveUp(items: QueueItem[], taskId: string): QueueItem[] {
  const index = items.findIndex((item) => item.taskId === taskId);
  if (index <= 0) return items;
  const next = [...items];
  const current = next[index];
  const prev = next[index - 1];
  next[index - 1] = { ...prev, sortOrder: current.sortOrder };
  next[index] = { ...current, sortOrder: prev.sortOrder };
  return next;
}

describe("queue reorder swap", () => {
  it("moves B up with unique dense sort_order", () => {
    const items: QueueItem[] = [
      { taskId: "A", sortOrder: 0 },
      { taskId: "B", sortOrder: 1 },
      { taskId: "C", sortOrder: 2 },
    ];

    const result = moveUp(items, "B");
    assert.equal(result[0]?.taskId, "B");
    assert.equal(result[1]?.taskId, "A");
    assert.equal(result[2]?.taskId, "C");

    const orders = result.map((item) => item.sortOrder);
    const unique = new Set(orders);
    assert.equal(unique.size, orders.length);
    assert.deepEqual([...orders].sort((a, b) => a - b), [0, 1, 2]);
  });
});
