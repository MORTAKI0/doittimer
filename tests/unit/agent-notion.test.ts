import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toAgentNotionConnection,
  toAgentNotionSyncSummary,
  toNotionSyncAutomationResponse,
} from "../../lib/automation/notion-route";

describe("agent notion mapping", () => {
  it("maps stored notion connection details to the public agent shape", () => {
    assert.deepEqual(
      toAgentNotionConnection({
        connected: true,
        database_id: "db-1",
        workspace_name: "Engineering Tasks",
        schema_version: 1,
        has_saved_token: true,
        last_synced_at: "2026-03-19T10:00:00.000Z",
        last_status: "success",
        last_error: null,
      }),
      {
        connected: true,
        databaseName: "Engineering Tasks",
        lastSyncedAt: "2026-03-19T10:00:00.000Z",
      },
    );
  });

  it("returns the required sync summary shape", () => {
    assert.deepEqual(
      toAgentNotionSyncSummary({
        createdProjects: 1,
        updatedProjects: 1,
        archivedProjects: 0,
        restoredProjects: 1,
        createdTasks: 5,
        updatedTasks: 10,
        archivedTasks: 2,
        restoredTasks: 3,
        warnings: 2,
      }),
      {
        projectsImported: 3,
        tasksImported: 18,
        projectsArchived: 0,
        tasksArchived: 2,
        warnings: ["Skipped 2 Notion page(s) that did not match the import schema."],
      },
    );
  });
});

describe("agent notion error responses", () => {
  it("returns 409 when notion is not connected", async () => {
    const response = toNotionSyncAutomationResponse({
      success: false,
      error: "Notion connection is not configured.",
      code: "not_connected",
    });
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "conflict");
  });

  it("returns upstream_error when notion API calls fail", async () => {
    const response = toNotionSyncAutomationResponse({
      success: false,
      error: "Notion API is unavailable. Please try again.",
      code: "upstream_error",
    });
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "upstream_error");
  });
});
