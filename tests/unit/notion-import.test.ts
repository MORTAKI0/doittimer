import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { decryptNotionToken, encryptNotionToken } from "@/lib/notion/crypto";
import {
  buildProjectKey,
  collectImportedProjects,
  computeMissingImportedIds,
  normalizeNotionTaskPage,
  validateNotionImportSchema,
} from "@/lib/notion/import";

describe("notion token encryption", () => {
  it("round-trips a stored token", () => {
    const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const token = "secret_test_token";

    const encrypted = encryptNotionToken(token, key);
    const decrypted = decryptNotionToken(encrypted, key);

    assert.notEqual(encrypted, token);
    assert.equal(decrypted, token);
  });
});

describe("notion import schema validation", () => {
  it("accepts the fixed v1 schema", () => {
    const error = validateNotionImportSchema({
      id: "db",
      properties: {
        Name: { type: "title" },
        Project: { type: "select" },
        Status: { type: "status" },
        "Due Date": { type: "date" },
        Notes: { type: "rich_text" },
      },
    });

    assert.equal(error, null);
  });

  it("rejects an invalid project property type", () => {
    const error = validateNotionImportSchema({
      id: "db",
      properties: {
        Name: { type: "title" },
        Project: { type: "checkbox" },
      },
    });

    assert.match(error ?? "", /Project/);
  });
});

describe("notion page normalization", () => {
  it("maps a Notion task page into a task import payload", () => {
    const task = normalizeNotionTaskPage({
      id: "page-1",
      archived: false,
      last_edited_time: "2026-03-07T12:00:00.000Z",
      properties: {
        Name: {
          type: "title",
          title: [{ plain_text: "Write docs" }],
        },
        Project: {
          type: "select",
          select: { name: "Sprint 4" },
        },
        Status: {
          type: "status",
          status: { name: "Done" },
        },
        "Due Date": {
          type: "date",
          date: { start: "2026-03-09" },
        },
      },
    });

    assert.deepEqual(task, {
      notionPageId: "page-1",
      title: "Write docs",
      projectName: "Sprint 4",
      projectKey: buildProjectKey("Sprint 4"),
      completed: true,
      scheduledFor: "2026-03-09",
      archived: false,
      lastEditedAt: "2026-03-07T12:00:00.000Z",
    });
  });

  it("deduplicates project names and finds missing imported ids", () => {
    const projects = collectImportedProjects([
      {
        notionPageId: "1",
        title: "A",
        projectName: "Roadmap",
        projectKey: buildProjectKey("Roadmap"),
        completed: false,
        scheduledFor: null,
        archived: false,
        lastEditedAt: null,
      },
      {
        notionPageId: "2",
        title: "B",
        projectName: "Roadmap",
        projectKey: buildProjectKey("Roadmap"),
        completed: false,
        scheduledFor: null,
        archived: false,
        lastEditedAt: null,
      },
    ]);

    assert.deepEqual(projects, [{ key: "roadmap", name: "Roadmap" }]);
    assert.deepEqual(computeMissingImportedIds(["p1", "p2"], ["p2"]), ["p1"]);
  });
});
