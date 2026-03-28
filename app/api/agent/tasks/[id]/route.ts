import {
  deleteTaskForUser,
  getTaskByIdForUser,
  setTaskCompletedForUser,
  updateTaskForUser,
} from "@/lib/services/tasks";
import {
  getAutomationRouteContext,
  parseJsonBody,
  patchTaskBodySchema,
  toAutomationErrorResponse,
} from "@/lib/automation/task-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  const result = await getTaskByIdForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
  );

  return toAutomationErrorResponse(result);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, patchTaskBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { id } = await params;
  let result = await getTaskByIdForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
  );

  if (!result.success) {
    return toAutomationErrorResponse(result);
  }

  const {
    completed,
    title,
    description,
    priority,
    scheduledFor,
    projectId,
  } = parsedBody.data;

  if (
    title !== undefined ||
    description !== undefined ||
    priority !== undefined ||
    scheduledFor !== undefined ||
    projectId !== undefined
  ) {
    result = await updateTaskForUser(context.value.supabase, context.value.auth.userId, id, {
      title,
      description,
      priority,
      scheduledFor,
      projectId,
    });
    if (!result.success) return toAutomationErrorResponse(result);
  }

  if (completed !== undefined) {
    result = await setTaskCompletedForUser(
      context.value.supabase,
      context.value.auth.userId,
      id,
      completed,
    );
    if (!result.success) return toAutomationErrorResponse(result);
  }

  return toAutomationErrorResponse(result);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  const result = await deleteTaskForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
  );

  return toAutomationErrorResponse(result);
}
