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

const pomodoroWorkMinutesSchema = z.number().int().min(1).max(240).nullable();
const pomodoroShortBreakMinutesSchema = z.number().int().min(1).max(60).nullable();
const pomodoroLongBreakMinutesSchema = z.number().int().min(1).max(120).nullable();
const pomodoroLongBreakEverySchema = z.number().int().min(1).max(12).nullable();

export const taskPomodoroOverridesSchema = z.object({
  workMinutes: pomodoroWorkMinutesSchema,
  shortBreakMinutes: pomodoroShortBreakMinutesSchema,
  longBreakMinutes: pomodoroLongBreakMinutesSchema,
  longBreakEvery: pomodoroLongBreakEverySchema,
});

export type TaskPomodoroOverridesInput = z.infer<typeof taskPomodoroOverridesSchema>;

export function parseNullableInteger(input: unknown): { value: number | null; valid: boolean } {
  if (input == null) return { value: null, valid: true };
  if (typeof input === "number") {
    if (!Number.isFinite(input) || !Number.isInteger(input)) {
      return { value: null, valid: false };
    }
    return { value: input, valid: true };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return { value: null, valid: true };
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return { value: null, valid: false };
    }
    return { value: parsed, valid: true };
  }
  return { value: null, valid: false };
}
