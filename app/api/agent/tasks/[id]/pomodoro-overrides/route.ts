import {
  getTaskByIdForUser,
  updateTaskPomodoroOverridesForUser,
} from "@/lib/services/tasks";
import {
  getAutomationRouteContext,
  mergePomodoroOverrides,
  parseJsonBody,
  pomodoroOverridesPatchSchema,
  toAutomationErrorResponse,
} from "@/lib/automation/task-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, pomodoroOverridesPatchSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { id } = await params;
  const taskResult = await getTaskByIdForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
  );

  if (!taskResult.success) {
    return toAutomationErrorResponse(taskResult);
  }

  const result = await updateTaskPomodoroOverridesForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
    mergePomodoroOverrides(taskResult.data, parsedBody.data),
  );

  return toAutomationErrorResponse(result);
}
