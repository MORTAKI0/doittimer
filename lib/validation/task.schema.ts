import { z } from "zod";
import { projectIdSchema } from "./project.schema";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est requis.")
  .max(500, "Le titre est trop long.");

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "La description est trop longue.");

export const taskPrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const taskIdSchema = z.string().uuid("Identifiant invalide.");
export const taskProjectIdSchema = projectIdSchema.nullable().optional();
export const taskScheduledForSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide. Format attendu: YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    );
  }, "Date invalide.");

export type TaskTitleInput = z.infer<typeof taskTitleSchema>;
export type TaskDescriptionInput = z.infer<typeof taskDescriptionSchema>;
export type TaskPriorityInput = z.infer<typeof taskPrioritySchema>;

export const taskEditableFieldsSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.nullable().optional(),
    priority: taskPrioritySchema.optional(),
    scheduledFor: taskScheduledForSchema.nullable().optional(),
    projectId: taskProjectIdSchema,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.priority !== undefined ||
      value.scheduledFor !== undefined ||
      value.projectId !== undefined,
    {
      message: "At least one updatable task field is required.",
    },
  );

export type TaskEditableFieldsInput = z.infer<typeof taskEditableFieldsSchema>;

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
