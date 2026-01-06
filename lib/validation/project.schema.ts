import { z } from "zod";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom est requis.")
  .max(120, "Le nom est trop long.");

export const projectIdSchema = z.string().uuid("Identifiant invalide.");

export type ProjectNameInput = z.infer<typeof projectNameSchema>;
