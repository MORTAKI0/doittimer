import { z } from "zod";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est requis.")
  .max(500, "Le titre est trop long.");

export type TaskTitleInput = z.infer<typeof taskTitleSchema>;
