"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { logServerError } from "@/lib/logging/logServerError";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  automationTokenIdSchema,
  automationTokenNameSchema,
} from "@/lib/validation/automation-token.schema";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type AutomationTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedAutomationToken = {
  id: string;
  rawToken: string;
  prefix: string;
};

const createAutomationTokenResultSchema = z.object({
  id: z.string().uuid(),
  raw_token: z.string().min(1),
  prefix: z.string().min(1),
});

function mapTokenRow(row: {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[] | null;
  created_at: string;
  last_used_at: string | null;
}): AutomationTokenListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    scopes: Array.isArray(row.scopes) && row.scopes.length > 0 ? row.scopes : ["*"],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      supabase,
      userId: null as string | null,
      error: "You must be signed in.",
    };
  }

  return {
    supabase,
    userId: data.user.id,
    error: null as string | null,
  };
}

export async function listTokens(): Promise<ActionResult<AutomationTokenListItem[]>> {
  try {
    const { supabase, userId, error } = await getAuthedUserId();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const { data, error: queryError } = await supabase
      .from("automation_tokens")
      .select("id, name, token_prefix, scopes, created_at, last_used_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (queryError) {
      throw queryError;
    }

    return {
      success: true,
      data: (data ?? []).map(mapTokenRow),
    };
  } catch (error) {
    logServerError({
      scope: "actions.automationTokens.listTokens",
      error,
    });
    return { success: false, error: "Unable to load automation tokens." };
  }
}

export async function createToken(name: string): Promise<ActionResult<CreatedAutomationToken>> {
  const parsedName = automationTokenNameSchema.safeParse(name);
  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Token name is invalid.",
    };
  }

  try {
    const { supabase, userId, error } = await getAuthedUserId();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const { data, error: rpcError } = await supabase.rpc("create_automation_token", {
      p_name: parsedName.data,
      p_scopes: ["*"],
    });

    if (rpcError) {
      throw rpcError;
    }

    const parsedResult = createAutomationTokenResultSchema.safeParse(data);
    if (!parsedResult.success) {
      throw new Error("Invalid create_automation_token response.");
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: {
        id: parsedResult.data.id,
        rawToken: parsedResult.data.raw_token,
        prefix: parsedResult.data.prefix,
      },
    };
  } catch (error) {
    logServerError({
      scope: "actions.automationTokens.createToken",
      error,
    });
    return { success: false, error: "Unable to create automation token." };
  }
}

export async function revokeToken(tokenId: string): Promise<ActionResult<{ id: string }>> {
  const parsedTokenId = automationTokenIdSchema.safeParse(tokenId);
  if (!parsedTokenId.success) {
    return { success: false, error: "Invalid token id." };
  }

  try {
    const { supabase, userId, error } = await getAuthedUserId();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const { data, error: updateError } = await supabase
      .from("automation_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", parsedTokenId.data)
      .eq("user_id", userId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    const tokenRow = data as { id: string } | null;

    if (!tokenRow) {
      return { success: false, error: "Automation token not found." };
    }

    revalidatePath("/settings");

    return { success: true, data: tokenRow };
  } catch (error) {
    logServerError({
      scope: "actions.automationTokens.revokeToken",
      error,
    });
    return { success: false, error: "Unable to revoke automation token." };
  }
}
