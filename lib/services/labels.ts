import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/logging/logServerError";
import { dedupeLabelIds, sortLabelsByName } from "@/lib/labels/utils";
import {
  createLabelSchema,
  labelIdSchema,
  setTaskLabelsSchema,
  updateLabelSchema,
} from "@/lib/validation/label.schema";

type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

export type LabelRecord = {
  id: string;
  name: string;
  colorHex: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type LabelDbRow = {
  id: string;
  name: string;
  color_hex: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TaskLabelLinkRow = {
  task_id: string;
  label_id: string;
};

function mapLabelRow(row: LabelDbRow): LabelRecord {
  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

async function assertTaskOwnedAndWritable(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, read_only, source")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { ok: false as const, error: "Tache introuvable." };
  }
  if (data.read_only || data.source === "notion") {
    return {
      ok: false as const,
      error: "This task is managed in Notion. Edit it in Notion and sync again.",
    };
  }

  return { ok: true as const };
}

async function getOwnedLabelsByIds(
  supabase: SupabaseClient,
  userId: string,
  labelIds: string[],
) {
  if (labelIds.length === 0) return [];

  const { data, error } = await supabase
    .from("labels")
    .select("id, name, color_hex, created_at, updated_at")
    .eq("user_id", userId)
    .in("id", labelIds);

  if (error) throw error;
  return (data ?? []) as LabelDbRow[];
}

export async function getLabelsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<LabelRecord[]>> {
  try {
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, color_hex, created_at, updated_at")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      logServerError({
        scope: "services.labels.getLabelsForUser",
        userId,
        error,
      });
      return { success: false, error: "Impossible de charger les labels." };
    }

    return {
      success: true,
      data: sortLabelsByName((data ?? []).map((row) => mapLabelRow(row as LabelDbRow))),
    };
  } catch (error) {
    logServerError({
      scope: "services.labels.getLabelsForUser",
      userId,
      error,
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export async function createLabelForUser(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; colorHex: string },
): Promise<ServiceResult<LabelRecord>> {
  const parsed = createLabelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("labels")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        color_hex: parsed.data.colorHex,
      })
      .select("id, name, color_hex, created_at, updated_at")
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return { success: false, error: "Un label avec ce nom existe deja." };
      }

      logServerError({
        scope: "services.labels.createLabelForUser",
        userId,
        error: error ?? new Error("Label insert returned no data."),
      });
      return { success: false, error: "Impossible de creer le label." };
    }

    return { success: true, data: mapLabelRow(data as LabelDbRow) };
  } catch (error) {
    logServerError({
      scope: "services.labels.createLabelForUser",
      userId,
      error,
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export async function updateLabelForUser(
  supabase: SupabaseClient,
  userId: string,
  input: { id: string; name?: string; colorHex?: string },
): Promise<ServiceResult<LabelRecord>> {
  const parsed = updateLabelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  const payload: Record<string, string> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.colorHex !== undefined) payload.color_hex = parsed.data.colorHex;

  try {
    const { data, error } = await supabase
      .from("labels")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id, name, color_hex, created_at, updated_at")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Un label avec ce nom existe deja." };
      }

      logServerError({
        scope: "services.labels.updateLabelForUser",
        userId,
        error,
        context: { labelId: parsed.data.id },
      });
      return { success: false, error: "Impossible de mettre a jour le label." };
    }

    if (!data) {
      return { success: false, error: "Label introuvable." };
    }

    return { success: true, data: mapLabelRow(data as LabelDbRow) };
  } catch (error) {
    logServerError({
      scope: "services.labels.updateLabelForUser",
      userId,
      error,
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export async function deleteLabelForUser(
  supabase: SupabaseClient,
  userId: string,
  labelId: string,
): Promise<ServiceResult<{ id: string }>> {
  const parsedId = labelIdSchema.safeParse(labelId);

  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Identifiant invalide.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("labels")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError({
        scope: "services.labels.deleteLabelForUser",
        userId,
        error,
        context: { labelId: parsedId.data },
      });
      return { success: false, error: "Impossible de supprimer le label." };
    }

    if (!data) {
      return { success: false, error: "Label introuvable." };
    }

    return { success: true, data: { id: parsedId.data } };
  } catch (error) {
    logServerError({
      scope: "services.labels.deleteLabelForUser",
      userId,
      error,
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export async function getTaskLabelsMapForTaskIds(
  supabase: SupabaseClient,
  userId: string,
  taskIds: string[],
): Promise<ServiceResult<Map<string, LabelRecord[]>>> {
  const uniqueTaskIds = dedupeLabelIds(taskIds);
  const emptyMap = new Map<string, LabelRecord[]>();

  for (const taskId of uniqueTaskIds) {
    emptyMap.set(taskId, []);
  }

  if (uniqueTaskIds.length === 0) {
    return { success: true, data: emptyMap };
  }

  try {
    const { data: links, error: linksError } = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .in("task_id", uniqueTaskIds);

    if (linksError) {
      logServerError({
        scope: "services.labels.getTaskLabelsMapForTaskIds",
        userId,
        error: linksError,
        context: { action: "select-links" },
      });
      return { success: false, error: "Impossible de charger les labels des taches." };
    }

    const linkRows = (links ?? []) as TaskLabelLinkRow[];
    const labelIds = dedupeLabelIds(linkRows.map((row) => row.label_id));
    if (labelIds.length === 0) {
      return { success: true, data: emptyMap };
    }

    const ownedLabels = await getOwnedLabelsByIds(supabase, userId, labelIds);
    const labelsById = new Map(ownedLabels.map((label) => [label.id, mapLabelRow(label)] as const));

    for (const link of linkRows) {
      const label = labelsById.get(link.label_id);
      if (!label) continue;
      const taskLabels = emptyMap.get(link.task_id) ?? [];
      taskLabels.push(label);
      emptyMap.set(link.task_id, taskLabels);
    }

    for (const [taskId, labels] of emptyMap.entries()) {
      emptyMap.set(taskId, sortLabelsByName(labels));
    }

    return { success: true, data: emptyMap };
  } catch (error) {
    logServerError({
      scope: "services.labels.getTaskLabelsMapForTaskIds",
      userId,
      error,
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export async function setTaskLabelsForUser(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  labelIds: string[],
): Promise<ServiceResult<LabelRecord[]>> {
  const parsed = setTaskLabelsSchema.safeParse({
    taskId,
    labelIds: dedupeLabelIds(labelIds),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Parametres invalides.",
    };
  }

  try {
    const writableTask = await assertTaskOwnedAndWritable(supabase, userId, parsed.data.taskId);
    if (!writableTask.ok) {
      return { success: false, error: writableTask.error };
    }

    const ownedLabels = await getOwnedLabelsByIds(supabase, userId, parsed.data.labelIds);
    const ownedLabelIds = new Set(ownedLabels.map((label) => label.id));
    const missingLabelId = parsed.data.labelIds.find((labelIdValue) => !ownedLabelIds.has(labelIdValue));

    if (missingLabelId) {
      return { success: false, error: "Label introuvable." };
    }

    if (parsed.data.labelIds.length === 0) {
      const { error: deleteError } = await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", parsed.data.taskId);

      if (deleteError) {
        logServerError({
          scope: "services.labels.setTaskLabelsForUser",
          userId,
          error: deleteError,
          context: { action: "clear-links", taskId: parsed.data.taskId },
        });
        return { success: false, error: "Impossible de mettre a jour les labels de la tache." };
      }

      return { success: true, data: [] };
    }

    const { data: existingLinks, error: existingLinksError } = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .eq("task_id", parsed.data.taskId);

    if (existingLinksError) {
      logServerError({
        scope: "services.labels.setTaskLabelsForUser",
        userId,
        error: existingLinksError,
        context: { action: "select-existing-links", taskId: parsed.data.taskId },
      });
      return { success: false, error: "Impossible de mettre a jour les labels de la tache." };
    }

    const existingLabelIds = new Set(
      ((existingLinks ?? []) as TaskLabelLinkRow[]).map((row) => row.label_id),
    );
    const nextLabelIds = new Set(parsed.data.labelIds);
    const labelIdsToDelete = Array.from(existingLabelIds).filter((labelIdValue) => !nextLabelIds.has(labelIdValue));
    const labelIdsToInsert = parsed.data.labelIds.filter((labelIdValue) => !existingLabelIds.has(labelIdValue));

    if (labelIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", parsed.data.taskId)
        .in("label_id", labelIdsToDelete);

      if (deleteError) {
        logServerError({
          scope: "services.labels.setTaskLabelsForUser",
          userId,
          error: deleteError,
          context: { action: "delete-extra-links", taskId: parsed.data.taskId },
        });
        return { success: false, error: "Impossible de mettre a jour les labels de la tache." };
      }
    }

    if (labelIdsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("task_labels")
        .insert(
          labelIdsToInsert.map((labelIdValue) => ({
            task_id: parsed.data.taskId,
            label_id: labelIdValue,
          })),
        );

      if (insertError) {
        logServerError({
          scope: "services.labels.setTaskLabelsForUser",
          userId,
          error: insertError,
          context: { action: "insert-missing-links", taskId: parsed.data.taskId },
        });
        return { success: false, error: "Impossible de mettre a jour les labels de la tache." };
      }
    }

    return {
      success: true,
      data: sortLabelsByName(ownedLabels.map((row) => mapLabelRow(row))),
    };
  } catch (error) {
    logServerError({
      scope: "services.labels.setTaskLabelsForUser",
      userId,
      error,
      context: { taskId, labelCount: labelIds.length },
    });
    return { success: false, error: "Erreur reseau. Verifie ta connexion et reessaie." };
  }
}

export type { ServiceResult };
