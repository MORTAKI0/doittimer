"use server";

import { revalidatePath } from "next/cache";

import { requireSignedInUser } from "@/lib/auth/get-user";
import {
  createLabelForUser,
  deleteLabelForUser,
  getLabelsForUser,
  setTaskLabelsForUser,
  updateLabelForUser,
  type LabelRecord,
  type ServiceResult,
} from "@/lib/services/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T> = ServiceResult<T>;

export type { LabelRecord };

function revalidateLabelSurfaces() {
  revalidatePath("/filters-labels");
  revalidatePath("/tasks");
  revalidatePath("/home");
  revalidatePath("/today");
  revalidatePath("/upcoming");
  revalidatePath("/inbox");
}

async function runWithSignedInUser<T>(
  handler: (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    userId: string,
  ) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const supabase = await createSupabaseServerClient();
  const auth = await requireSignedInUser(supabase);

  if (auth.error || !auth.user) {
    return { success: false, error: auth.error };
  }

  return handler(supabase, auth.user.id);
}

export async function getLabels(): Promise<ActionResult<LabelRecord[]>> {
  return runWithSignedInUser((supabase, userId) => getLabelsForUser(supabase, userId));
}

export async function createLabel(
  input: { name: string; colorHex: string },
): Promise<ActionResult<LabelRecord>> {
  return runWithSignedInUser(async (supabase, userId) => {
    const result = await createLabelForUser(supabase, userId, input);
    if (result.success) {
      revalidateLabelSurfaces();
    }
    return result;
  });
}

export async function updateLabel(
  input: { id: string; name?: string; colorHex?: string },
): Promise<ActionResult<LabelRecord>> {
  return runWithSignedInUser(async (supabase, userId) => {
    const result = await updateLabelForUser(supabase, userId, input);
    if (result.success) {
      revalidateLabelSurfaces();
    }
    return result;
  });
}

export async function deleteLabel(labelId: string): Promise<ActionResult<{ id: string }>> {
  return runWithSignedInUser(async (supabase, userId) => {
    const result = await deleteLabelForUser(supabase, userId, labelId);
    if (result.success) {
      revalidateLabelSurfaces();
    }
    return result;
  });
}

export async function setTaskLabels(
  taskId: string,
  labelIds: string[],
): Promise<ActionResult<LabelRecord[]>> {
  return runWithSignedInUser(async (supabase, userId) => {
    const result = await setTaskLabelsForUser(supabase, userId, taskId, labelIds);
    if (result.success) {
      revalidateLabelSurfaces();
      revalidatePath("/focus");
    }
    return result;
  });
}
