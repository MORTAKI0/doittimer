import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { logServerError } from "@/lib/logging/logServerError";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const TOKEN_PREFIX = "ditm_";
const TOKEN_PREFIX_LENGTH = 12;
const TOKEN_BYTES = 24;

export type AutomationAuthContext = {
  userId: string;
  tokenId: string;
  scopes: string[];
};

function toTokenBody(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateToken() {
  const rawToken = `${TOKEN_PREFIX}${toTokenBody(randomBytes(TOKEN_BYTES))}`;
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    tokenPrefix: rawToken.slice(0, TOKEN_PREFIX_LENGTH),
  };
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, value, ...rest] = header.trim().split(/\s+/);
  if (scheme !== "Bearer" || !value || rest.length > 0) {
    return null;
  }

  return value;
}

export async function requireAutomationAuth(
  request: Request,
): Promise<AutomationAuthContext | null> {
  const rawToken = readBearerToken(request);
  if (!rawToken) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const tokenHash = hashToken(rawToken);
    const { data, error } = await supabase
      .from("automation_tokens")
      .select("id, user_id, scopes, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const tokenRow = data as {
      id: string;
      user_id: string;
      scopes: string[] | null;
      revoked_at: string | null;
    } | null;

    if (!tokenRow || tokenRow.revoked_at) {
      return null;
    }

    const { error: updateError } = await supabase
      .from("automation_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    if (updateError) {
      throw updateError;
    }

    return {
      userId: tokenRow.user_id,
      tokenId: tokenRow.id,
      scopes: Array.isArray(tokenRow.scopes) && tokenRow.scopes.length > 0 ? tokenRow.scopes : ["*"],
    };
  } catch (error) {
    logServerError({
      scope: "automation.requireAutomationAuth",
      error,
    });
    throw error;
  }
}
