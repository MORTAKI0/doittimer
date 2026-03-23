import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireAutomationAuth, type AutomationAuthContext } from "@/lib/automation/auth";
import { checkAutomationRateLimit } from "@/lib/automation/rate-limit";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ServiceResult,
  TaskFilters,
  TaskPomodoroOverrides,
  TaskRow,
} from "@/lib/services/tasks";
import {
  taskPomodoroOverridesSchema,
  taskProjectIdSchema,
  taskScheduledForSchema,
  taskTitleSchema,
} from "@/lib/validation/task.schema";

const NOTION_READ_ONLY_PATTERN = /managed in notion/i;

function sanitizeBodyPreview(rawBody: string) {
  return rawBody
    .slice(0, 120)
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/[^\x20-\x7E]/g, "?");
}

function logJsonBodyDiagnostic(
  request: Request,
  phase: "read-error" | "empty-body" | "parse-error",
  details: Record<string, unknown> = {},
) {
  console.error({
    prefix: "[doittimer]",
    scope: "automation.parseJsonBody",
    phase,
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
    bodyUsed: request.bodyUsed,
    ...details,
  });
}

const listTasksQuerySchema = z.object({
  status: z.enum(["active", "completed", "archived", "all"]).optional(),
  projectId: z.string().trim().optional(),
  scheduledDate: z.string().trim().optional(),
  query: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createTaskBodySchema = z.object({
  title: taskTitleSchema,
  projectId: taskProjectIdSchema,
  scheduledFor: taskScheduledForSchema.nullable().optional(),
});

const patchTaskBodySchema = z
  .object({
    title: taskTitleSchema.optional(),
    completed: z.boolean().optional(),
    scheduledFor: taskScheduledForSchema.nullable().optional(),
    projectId: taskProjectIdSchema,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.completed !== undefined ||
      value.scheduledFor !== undefined ||
      value.projectId !== undefined,
    {
      message: "At least one updatable task field is required.",
    },
  );

const pomodoroOverridesPatchSchema = taskPomodoroOverridesSchema
  .partial()
  .refine(
    (value) =>
      value.workMinutes !== undefined ||
      value.shortBreakMinutes !== undefined ||
      value.longBreakMinutes !== undefined ||
      value.longBreakEvery !== undefined,
    {
      message: "At least one pomodoro override field is required.",
    },
  );

type RouteContext = {
  auth: AutomationAuthContext;
  supabase: SupabaseClient;
};

type AutomationRouteOptions = {
  rateLimit?: {
    scope: string;
    limit: number;
    windowMs: number;
  };
};

type RouteContextResult =
  | { ok: true; value: RouteContext }
  | { ok: false; response: Response };

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type PatchTaskBody = z.infer<typeof patchTaskBodySchema>;
export type PomodoroOverridesPatchBody = z.infer<typeof pomodoroOverridesPatchSchema>;

function isReadOnlyError(message: string) {
  return NOTION_READ_ONLY_PATTERN.test(message);
}

function isValidationError(message: string) {
  return (
    /invalide/i.test(message) ||
    /invalid/i.test(message) ||
    /requis/i.test(message) ||
    /required/i.test(message) ||
    /trop long/i.test(message)
  );
}

export async function getAutomationRouteContext(
  request: Request,
  options?: AutomationRouteOptions,
): Promise<RouteContextResult> {
  try {
    const auth = await requireAutomationAuth(request);

    if (!auth) {
      return {
        ok: false,
        response: errorResponse(
          AUTOMATION_ERROR_CODES.unauthorized,
          "Unauthorized",
          401,
        ),
      };
    }

    if (options?.rateLimit) {
      const rateLimit = checkAutomationRateLimit(auth.tokenId, options.rateLimit);
      if (!rateLimit.ok) {
        return {
          ok: false,
          response: errorResponse(
            AUTOMATION_ERROR_CODES.rateLimited,
            "Rate limit exceeded.",
            429,
            undefined,
            {
              "Retry-After": String(Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000))),
            },
          ),
        };
      }
    }

    return {
      ok: true,
      value: {
        auth,
        supabase: createSupabaseAdminClient(),
      },
    };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.internalError,
        "Automation authentication is unavailable.",
        500,
      ),
    };
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let rawBody: string;
  let body: unknown;

  try {
    rawBody = await request.text();
  } catch (error) {
    logJsonBodyDiagnostic(request, "read-error", {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        "Invalid JSON body.",
        400,
      ),
    };
  }

  const normalizedBody = rawBody.replace(/^\uFEFF/, "").trim();

  if (normalizedBody.length === 0) {
    logJsonBodyDiagnostic(request, "empty-body", {
      rawLength: rawBody.length,
      rawPreview: sanitizeBodyPreview(rawBody),
    });
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        "Invalid JSON body.",
        400,
      ),
    };
  }

  try {
    body = JSON.parse(normalizedBody);
  } catch (error) {
    logJsonBodyDiagnostic(request, "parse-error", {
      rawLength: rawBody.length,
      normalizedLength: normalizedBody.length,
      rawPreview: sanitizeBodyPreview(rawBody),
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        "Invalid JSON body.",
        400,
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        AUTOMATION_ERROR_CODES.badRequest,
        parsed.error.issues[0]?.message ?? "Invalid request body.",
        400,
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parseTaskFiltersFromRequest(
  request: Request,
): { ok: true; filters: TaskFilters } | { ok: false; response: Response } {
  const { searchParams } = new URL(request.url);
  const raw = {
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    scheduledDate: searchParams.get("scheduledDate") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = listTasksQuerySchema.safeParse(raw);

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

  const filters: TaskFilters = {
    page: parsed.data.page,
    limit: parsed.data.limit,
    status: parsed.data.status,
    query: parsed.data.query,
  };

  if (parsed.data.projectId !== undefined) {
    const projectId = parsed.data.projectId === "" ? null : parsed.data.projectId;
    const parsedProjectId = taskProjectIdSchema.safeParse(projectId);
    if (!parsedProjectId.success) {
      return {
        ok: false,
        response: errorResponse(
          AUTOMATION_ERROR_CODES.badRequest,
          parsedProjectId.error.issues[0]?.message ?? "Invalid projectId.",
          400,
        ),
      };
    }
    filters.projectId = parsedProjectId.data ?? null;
  }

  if (parsed.data.scheduledDate !== undefined) {
    const parsedScheduledDate = taskScheduledForSchema.safeParse(parsed.data.scheduledDate);
    if (!parsedScheduledDate.success) {
      return {
        ok: false,
        response: errorResponse(
          AUTOMATION_ERROR_CODES.badRequest,
          parsedScheduledDate.error.issues[0]?.message ?? "Invalid scheduledDate.",
          400,
        ),
      };
    }
    filters.scheduledDate = parsedScheduledDate.data;
    filters.scheduledRange = "day";
  }

  return { ok: true, filters };
}

export function createTaskSuccessResponse<T>(data: T) {
  return successResponse(data, 201);
}

export function toAutomationErrorResponse<T>(result: ServiceResult<T>) {
  if (result.success) {
    return successResponse(result.data);
  }

  if (result.error === "Task not found") {
    return errorResponse(AUTOMATION_ERROR_CODES.notFound, result.error, 404);
  }

  if (isReadOnlyError(result.error)) {
    return errorResponse(
      AUTOMATION_ERROR_CODES.readOnlyResource,
      result.error,
      409,
    );
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

export function mergePomodoroOverrides(
  task: TaskRow,
  patch: PomodoroOverridesPatchBody,
): TaskPomodoroOverrides {
  return {
    workMinutes:
      patch.workMinutes !== undefined ? patch.workMinutes : task.pomodoro_work_minutes ?? null,
    shortBreakMinutes:
      patch.shortBreakMinutes !== undefined
        ? patch.shortBreakMinutes
        : task.pomodoro_short_break_minutes ?? null,
    longBreakMinutes:
      patch.longBreakMinutes !== undefined
        ? patch.longBreakMinutes
        : task.pomodoro_long_break_minutes ?? null,
    longBreakEvery:
      patch.longBreakEvery !== undefined
        ? patch.longBreakEvery
        : task.pomodoro_long_break_every ?? null,
  };
}

export {
  createTaskBodySchema,
  patchTaskBodySchema,
  pomodoroOverridesPatchSchema,
};
