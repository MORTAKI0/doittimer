import { z } from "zod";

import { getAutomationRouteContext, parseJsonBody } from "@/lib/automation/task-route";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";
import { taskIdSchema, taskScheduledForSchema } from "@/lib/validation/task.schema";

const queueDateQuerySchema = z.object({
  date: taskScheduledForSchema.optional(),
});

const queueCreateBodySchema = z.object({
  taskId: taskIdSchema,
  date: taskScheduledForSchema.optional(),
});

const dashboardSummaryQuerySchema = z
  .object({
    range: z.enum(["today", "yesterday", "this_week", "last_week", "custom"]),
    from: taskScheduledForSchema.optional(),
    to: taskScheduledForSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.range !== "custom") {
      return;
    }

    if (!value.from || !value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom range requires valid from and to dates.",
        path: ["range"],
      });
    }
  });

const dashboardTrendsQuerySchema = z.object({
  days: z.enum(["7", "30"]).optional(),
});

type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

function isNotFoundError(message: string) {
  return /task not found/i.test(message) || /tache introuvable/i.test(message);
}

function isConflictError(message: string) {
  return /limite de 7 elements atteinte/i.test(message);
}

function isValidationError(message: string) {
  return (
    /identifiant invalide/i.test(message) ||
    /date invalide/i.test(message) ||
    /custom range requires valid from and to dates/i.test(message)
  );
}

export type QueueCreateBody = z.infer<typeof queueCreateBodySchema>;

export function parseQueueDateFromRequest(
  request: Request,
): { ok: true; queueDate?: string } | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const parsed = queueDateQuerySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        parsed.error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      ),
    };
  }

  return {
    ok: true,
    queueDate: parsed.data.date,
  };
}

export function parseDashboardSummaryQueryFromRequest(
  request: Request,
):
  | { ok: true; value: z.infer<typeof dashboardSummaryQuerySchema> }
  | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const parsed = dashboardSummaryQuerySchema.safeParse({
    range: searchParams.get("range") ?? "today",
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        parsed.error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      ),
    };
  }

  return { ok: true, value: parsed.data };
}

export function parseDashboardTrendsQueryFromRequest(
  request: Request,
): { ok: true; days: 7 | 30 } | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const parsed = dashboardTrendsQuerySchema.safeParse({
    days: searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        parsed.error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      ),
    };
  }

  return {
    ok: true,
    days: parsed.data.days === "30" ? 30 : 7,
  };
}

export function toQueueDashboardAutomationResponse<T>(result: ServiceResult<T>) {
  if (result.success) {
    return successResponse(result.data);
  }

  if (isNotFoundError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.notFound, result.error, 404);
  }

  if (isConflictError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.conflict, result.error, 409);
  }

  if (isValidationError(result.error)) {
    return errorResponse(AUTOMATION_ERROR_CODES.badRequest, result.error, 400);
  }

  return errorResponse(
    AUTOMATION_ERROR_CODES.internalError,
    result.error,
    500,
  );
}

export {
  getAutomationRouteContext,
  parseJsonBody,
  queueCreateBodySchema,
};
