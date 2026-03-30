import { z } from "zod";

import { getAutomationRouteContext, parseJsonBody } from "@/lib/automation/task-route";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";
import type { ServiceResult } from "@/lib/services/sessions";
import { sessionIdSchema } from "@/lib/validation/session.schema";
import { projectIdSchema } from "@/lib/validation/project.schema";
import { taskIdSchema } from "@/lib/validation/task.schema";

const daySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide. Format attendu: YYYY-MM-DD.");

export const startSessionBodySchema = z.object({
  taskId: taskIdSchema.nullable().optional(),
  projectId: projectIdSchema.nullable().optional(),
  musicUrl: z.string().trim().nullable().optional(),
});

export const stopSessionBodySchema = z.object({
  sessionId: sessionIdSchema,
});

export const editSessionBodySchema = z
  .object({
    startedAt: z.string().trim().datetime({ offset: true }).optional(),
    endedAt: z.string().trim().datetime({ offset: true }).optional(),
    taskId: taskIdSchema.nullable().optional(),
    editReason: z.string().trim().max(500, "Raison d'edition trop longue.").optional(),
  })
  .refine(
    (value) =>
      value.startedAt !== undefined ||
      value.endedAt !== undefined ||
      value.taskId !== undefined ||
      value.editReason !== undefined,
    {
      message: "At least one updatable session field is required.",
    },
  );

export const manualSessionBodySchema = z.object({
  startedAt: z.string().trim().datetime({ offset: true }),
  endedAt: z.string().trim().datetime({ offset: true }),
  taskId: taskIdSchema.nullable().optional(),
});

export const pomodoroBodySchema = z.object({
  sessionId: sessionIdSchema,
});

function isValidationError(message: string) {
  return (
    /identifiant invalide/i.test(message) ||
    /invalid identifier/i.test(message) ||
    /date invalide/i.test(message) ||
    /parametres invalides/i.test(message) ||
    /at least one updatable session field is required/i.test(message) ||
    /raison d'edition trop longue/i.test(message) ||
    /heure de fin/i.test(message) ||
    /duree maximale/i.test(message) ||
    /lien musical invalide/i.test(message)
  );
}

function isConflictError(message: string) {
  return /session est deja active/i.test(message);
}

function isNotFoundError(message: string) {
  return /session not found/i.test(message) || /pomodoro session not found/i.test(message);
}

export function parseSessionFiltersFromRequest(
  request: Request,
): { ok: true; filters: { day?: string; timeZone?: string } } | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const dayValue = searchParams.get("day");
  const timeZone = searchParams.get("tz");

  if (dayValue != null) {
    const parsedDay = daySchema.safeParse(dayValue);
    if (!parsedDay.success) {
      return {
        ok: false,
        response: errorResponse(
          AUTOMATION_ERROR_CODES.badRequest,
          parsedDay.error.issues[0]?.message ?? "Invalid query parameters.",
          400,
        ),
      };
    }

    return {
      ok: true,
      filters: {
        day: parsedDay.data,
        timeZone: timeZone?.trim() || undefined,
      },
    };
  }

  return {
    ok: true,
    filters: {
      timeZone: timeZone?.trim() || undefined,
    },
  };
}

export function createSessionSuccessResponse<T>(data: T) {
  return successResponse(data, 201);
}

export function toSessionAutomationResponse<T>(result: ServiceResult<T>) {
  if (result.success) {
    return successResponse(result.data);
  }

  if (isConflictError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.conflict, result.error, 409);
  }

  if (isNotFoundError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.notFound, result.error, 404);
  }

  if (isValidationError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.badRequest, result.error, 400);
  }

  return errorResponse(AUTOMATION_ERROR_CODES.internalError, result.error, 500);
}

export { getAutomationRouteContext, parseJsonBody };
