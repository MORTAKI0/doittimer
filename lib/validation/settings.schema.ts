import { z } from "zod";

import { taskIdSchema } from "@/lib/validation/task.schema";

export const TIMEZONE_OPTIONS = [
  "Africa/Casablanca",
  "UTC",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Tokyo",
] as const;

export const SETTINGS_LIMITS = {
  pomodoroWorkMinutes: { min: 1, max: 240 },
  pomodoroShortBreakMinutes: { min: 1, max: 60 },
  pomodoroLongBreakMinutes: { min: 1, max: 120 },
  pomodoroLongBreakEvery: { min: 1, max: 12 },
} as const;

const TIMEZONE_LOOKUP = new Map(
  TIMEZONE_OPTIONS.map((timeZone) => [timeZone.toLowerCase(), timeZone] as const),
);

export function normalizeTimezone(value: string | null | undefined) {
  if (!value) return null;

  const normalized = TIMEZONE_LOOKUP.get(value.trim().toLowerCase());
  return normalized ?? null;
}

export const timezoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeTimezone(value);

  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Timezone is invalid.",
    });
    return z.NEVER;
  }

  return normalized;
});

export const defaultTaskIdSchema = taskIdSchema.nullable().optional();
export const pomodoroWorkMinutesSchema = z.coerce
  .number()
  .int()
  .min(SETTINGS_LIMITS.pomodoroWorkMinutes.min)
  .max(SETTINGS_LIMITS.pomodoroWorkMinutes.max);
export const pomodoroShortBreakMinutesSchema = z.coerce
  .number()
  .int()
  .min(SETTINGS_LIMITS.pomodoroShortBreakMinutes.min)
  .max(SETTINGS_LIMITS.pomodoroShortBreakMinutes.max);
export const pomodoroLongBreakMinutesSchema = z.coerce
  .number()
  .int()
  .min(SETTINGS_LIMITS.pomodoroLongBreakMinutes.min)
  .max(SETTINGS_LIMITS.pomodoroLongBreakMinutes.max);
export const pomodoroLongBreakEverySchema = z.coerce
  .number()
  .int()
  .min(SETTINGS_LIMITS.pomodoroLongBreakEvery.min)
  .max(SETTINGS_LIMITS.pomodoroLongBreakEvery.max);

export const settingsAgentPatchSchema = z
  .object({
    timezone: timezoneSchema.optional(),
    pomodoroWorkMinutes: pomodoroWorkMinutesSchema.optional(),
    pomodoroShortBreakMinutes: pomodoroShortBreakMinutesSchema.optional(),
    pomodoroLongBreakMinutes: pomodoroLongBreakMinutesSchema.optional(),
    pomodoroLongBreakEvery: pomodoroLongBreakEverySchema.optional(),
    autoArchiveCompleted: z.boolean().optional(),
    defaultTaskId: defaultTaskIdSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.timezone !== undefined ||
      value.pomodoroWorkMinutes !== undefined ||
      value.pomodoroShortBreakMinutes !== undefined ||
      value.pomodoroLongBreakMinutes !== undefined ||
      value.pomodoroLongBreakEvery !== undefined ||
      value.autoArchiveCompleted !== undefined ||
      value.defaultTaskId !== undefined,
    {
      message: "At least one settings field is required.",
    },
  );
