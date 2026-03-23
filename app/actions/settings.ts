"use server";

import { revalidatePath } from "next/cache";

import { logServerError } from "@/lib/logging/logServerError";
import {
  getUserSettingsForUser,
  type UserSettings,
  upsertUserSettingsForUser,
} from "@/lib/services/settings";
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

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    return getUserSettingsForUser(supabase, userId);
  } catch (error) {
    logServerError({
      scope: "actions.settings.getUserSettings",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export async function upsertUserSettings(
  timezone: string,
  defaultTaskId?: string | null,
  pomodoroWorkMinutes = 25,
  pomodoroShortBreakMinutes = 5,
  pomodoroLongBreakMinutes = 15,
  pomodoroLongBreakEvery = 4,
): Promise<void> {
  const { supabase, userId, error } = await getAuthedContext();
  if (error || !userId) {
    throw new Error(error ?? "You must be signed in.");
  }

  const result = await upsertUserSettingsForUser(supabase, userId, {
    timezone,
    defaultTaskId,
    pomodoroWorkMinutes,
    pomodoroShortBreakMinutes,
    pomodoroLongBreakMinutes,
    pomodoroLongBreakEvery,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  revalidatePath("/settings");
  revalidatePath("/focus");
}

export async function updateAutoArchiveCompleted(
  autoArchiveCompleted: boolean,
): Promise<ActionResult<UserSettings>> {
  try {
    const { supabase, userId, error } = await getAuthedContext();
    if (error || !userId) {
      return { success: false, error: error ?? "You must be signed in." };
    }

    const result = await upsertUserSettingsForUser(supabase, userId, {
      autoArchiveCompleted,
    });

    if (!result.success) {
      return result;
    }

    revalidatePath("/settings");
    revalidatePath("/tasks");
    revalidatePath("/focus");

    return result;
  } catch (error) {
    logServerError({
      scope: "actions.settings.updateAutoArchiveCompleted",
      error,
    });
    return { success: false, error: "Network error. Check your connection and try again." };
  }
}

export type { UserSettings };
