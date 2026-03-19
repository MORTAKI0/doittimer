import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET as getAgentHealth } from "../../app/api/agent/health/route";
import { generateToken, hashToken } from "../../lib/automation/auth";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "../../lib/automation/response";

describe("automation token helpers", () => {
  it("generates a ditm token and matching sha256 hash", () => {
    const token = generateToken();

    assert.match(token.rawToken, /^ditm_[A-Za-z0-9_-]+$/);
    assert.equal(token.tokenPrefix, token.rawToken.slice(0, 12));
    assert.equal(token.tokenHash, hashToken(token.rawToken));
  });
});

describe("automation responses", () => {
  it("wraps success payloads with meta", async () => {
    const response = successResponse({ status: "ok" });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
    assert.equal(typeof body.meta.requestId, "string");
    assert.equal(typeof body.meta.timestamp, "string");
  });

  it("wraps error payloads with code and meta", async () => {
    const response = errorResponse(
      AUTOMATION_ERROR_CODES.unauthorized,
      "Unauthorized",
      401,
    );
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "unauthorized");
    assert.equal(body.error.message, "Unauthorized");
    assert.equal(typeof body.meta.requestId, "string");
  });
});

describe("GET /api/agent/health", () => {
  it("returns wrapped health status without auth", async () => {
    const response = await getAgentHealth();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data, {
      service: "doittimer",
      version: "v1",
      status: "ok",
    });
  });
});
