"use server";

import { revalidatePath } from "next/cache";

import { logServerError } from "@/lib/logging/logServerError";
import {
  disconnectNotionForUser,
  getNotionConnectionForUser,
  runNotionImportForUser,
  saveNotionConnectionForUser,
  type NotionConnectionSummary,
  type NotionSyncSummary,
  type NotionValidationSummary,
  validateNotionConnectionForUser,
} from "@/lib/services/notion";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { supabase, userId: null as string | null, error: "You must be signed in." };
  }

  return { supabase, userId: userData.user.id, error: null as string | null };
}

export async function getNotionConnection(): Promise<ActionResult<NotionConnectionSummary>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    return getNotionConnectionForUser(supabase, userId);
  } catch (error) {
    logServerError({
      scope: "actions.notion.getNotionConnection",
      error,
    });
    return { success: false, error: "Unable to load Notion connection." };
  }
}

export async function validateNotionConnection(
  tokenInput: string,
  databaseIdInput: string,
): Promise<ActionResult<NotionValidationSummary>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    return validateNotionConnectionForUser(supabase, userId, tokenInput, databaseIdInput);
  } catch (error) {
    logServerError({
      scope: "actions.notion.validateNotionConnection",
      error,
    });
    return { success: false, error: "Unable to validate Notion database." };
  }
}

export async function saveNotionConnection(
  tokenInput: string,
  databaseIdInput: string,
): Promise<ActionResult<NotionConnectionSummary>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const result = await saveNotionConnectionForUser(
      supabase,
      userId,
      tokenInput,
      databaseIdInput,
    );

    if (result.success) {
      revalidatePath("/settings");
    }

    return result;
  } catch (error) {
    logServerError({
      scope: "actions.notion.saveNotionConnection",
      error,
    });
    return { success: false, error: "Unable to save Notion connection." };
  }
}

export async function disconnectNotion(): Promise<ActionResult<NotionConnectionSummary>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const result = await disconnectNotionForUser(supabase, userId);

    if (result.success) {
      revalidatePath("/settings");
    }

    return result;
  } catch (error) {
    logServerError({
      scope: "actions.notion.disconnectNotion",
      error,
    });
    return { success: false, error: "Unable to disconnect Notion." };
  }
}

export async function runNotionImport(): Promise<ActionResult<NotionSyncSummary>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const result = await runNotionImportForUser(supabase, userId);

    if (result.success) {
      revalidatePath("/settings");
      revalidatePath("/tasks");
      revalidatePath("/focus");
      revalidatePath("/dashboard");
    }

    return result;
  } catch (error) {
    logServerError({
      scope: "actions.notion.runNotionImport",
      error,
    });
    return { success: false, error: "Unable to run Notion import." };
  }
}

export const connectNotion = saveNotionConnection;
export const syncNotionNow = runNotionImport;

export type {
  NotionConnectionSummary,
  NotionSyncSummary,
  NotionValidationSummary,
};
