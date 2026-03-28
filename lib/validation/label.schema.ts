import { z } from "zod";

import { LABEL_COLOR_PRESETS, isLabelColorPreset, normalizeLabelColor } from "@/lib/labels/palette";
import { normalizeLabelName } from "@/lib/labels/utils";

export const labelIdSchema = z.string().uuid("Identifiant invalide.");

export const labelNameSchema = z
  .string()
  .transform((value) => normalizeLabelName(value))
  .pipe(
    z
      .string()
      .min(1, "Le nom du label est requis.")
      .max(50, "Le nom du label est trop long."),
  );

export const labelColorSchema = z
  .string()
  .transform((value) => normalizeLabelColor(value))
  .refine((value) => isLabelColorPreset(value), {
    message: "Couleur de label invalide.",
  });

export const createLabelSchema = z.object({
  name: labelNameSchema,
  colorHex: labelColorSchema,
});

export const updateLabelSchema = z
  .object({
    id: labelIdSchema,
    name: labelNameSchema.optional(),
    colorHex: labelColorSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.colorHex !== undefined, {
    message: "At least one label field is required.",
  });

export const setTaskLabelsSchema = z.object({
  taskId: z.string().uuid("Identifiant invalide."),
  labelIds: z.array(labelIdSchema),
});

export type LabelIdInput = z.infer<typeof labelIdSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type SetTaskLabelsInput = z.infer<typeof setTaskLabelsSchema>;

export { LABEL_COLOR_PRESETS };
