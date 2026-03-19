import { createTaskForUser, getTasksForUser } from "@/lib/services/tasks";
import { getIdempotencyKey, runIdempotent } from "@/lib/automation/idempotency";
import {
  createTaskBodySchema,
  createTaskSuccessResponse,
  getAutomationRouteContext,
  parseJsonBody,
  parseTaskFiltersFromRequest,
  toAutomationErrorResponse,
} from "@/lib/automation/task-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const filters = parseTaskFiltersFromRequest(request);
  if (!filters.ok) return filters.response;

  const result = await getTasksForUser(
    context.value.supabase,
    context.value.auth.userId,
    filters.filters,
  );

  return toAutomationErrorResponse(result);
}

export async function POST(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, createTaskBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const idempotencyKey = getIdempotencyKey(request);
  const executeCreate = () =>
    createTaskForUser(context.value.supabase, context.value.auth.userId, parsedBody.data);

  const result = idempotencyKey
    ? await runIdempotent(
        "agent.tasks.create",
        context.value.auth.userId,
        idempotencyKey,
        executeCreate,
      )
    : await executeCreate();

  if (!result.success) {
    return toAutomationErrorResponse(result);
  }

  return createTaskSuccessResponse(result.data);
}
