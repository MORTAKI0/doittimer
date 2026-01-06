import { z } from "zod";
import { projectIdSchema } from "./project.schema";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est requis.")
  .max(500, "Le titre est trop long.");

export const taskIdSchema = z.string().uuid("Identifiant invalide.");
export const taskProjectIdSchema = projectIdSchema.nullable().optional();

export type TaskTitleInput = z.infer<typeof taskTitleSchema>;
