import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sortLabelsByName, normalizeLabelNameForUniqueness } from "../../lib/labels/utils";
import { createLabelSchema, labelColorSchema, setTaskLabelsSchema } from "../../lib/validation/label.schema";

describe("label schemas", () => {
  it("trims label names and keeps uniqueness normalization stable", () => {
    const parsed = createLabelSchema.safeParse({
      name: "  Client  ",
      colorHex: "#DB4035",
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;

    assert.equal(parsed.data.name, "Client");
    assert.equal(normalizeLabelNameForUniqueness(" Client "), "client");
  });

  it("rejects colors outside the approved preset list", () => {
    const parsed = labelColorSchema.safeParse("#123456");
    assert.equal(parsed.success, false);
  });

  it("accepts empty label selection for unassign-all", () => {
    const parsed = setTaskLabelsSchema.safeParse({
      taskId: "123e4567-e89b-12d3-a456-426614174000",
      labelIds: [],
    });

    assert.equal(parsed.success, true);
  });
});

describe("label sorting", () => {
  it("sorts labels alphabetically for stable task rendering", () => {
    const sorted = sortLabelsByName([
      { id: "2", name: "waiting", colorHex: "#DB4035" },
      { id: "1", name: "Client", colorHex: "#14AAF5" },
      { id: "3", name: "deep work", colorHex: "#299438" },
    ]);

    assert.deepEqual(
      sorted.map((label) => label.name),
      ["Client", "deep work", "waiting"],
    );
  });
});
