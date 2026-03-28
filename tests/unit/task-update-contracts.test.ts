import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { patchTaskBodySchema } from "../../lib/automation/task-route";
import { taskEditableFieldsSchema } from "../../lib/validation/task.schema";

describe("task editable fields schema", () => {
  it("accepts description and priority updates", () => {
    const parsed = taskEditableFieldsSchema.safeParse({
      description: "  Keep the context nearby.  ",
      priority: 2,
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal(parsed.data.description, "Keep the context nearby.");
    assert.equal(parsed.data.priority, 2);
  });

  it("normalizes blank descriptions to an empty string for server-side null handling", () => {
    const parsed = taskEditableFieldsSchema.safeParse({
      description: "   ",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal(parsed.data.description, "");
  });

  it("rejects invalid priority values", () => {
    const parsed = taskEditableFieldsSchema.safeParse({
      priority: 5,
    });

    assert.equal(parsed.success, false);
  });
});

describe("agent task patch schema", () => {
  it("accepts partial updates without overwriting omitted fields", () => {
    const parsed = patchTaskBodySchema.safeParse({
      title: "Updated title",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal("description" in parsed.data, false);
    assert.equal("priority" in parsed.data, false);
  });

  it("accepts description null clearing and explicit priority updates", () => {
    const parsed = patchTaskBodySchema.safeParse({
      description: null,
      priority: 1,
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal(parsed.data.description, null);
    assert.equal(parsed.data.priority, 1);
  });
});
