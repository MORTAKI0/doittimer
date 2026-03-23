import { addTaskToQueueForUser } from "@/lib/services/queue";
import {
  getAutomationRouteContext,
  parseJsonBody,
  queueCreateBodySchema,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";
import { successResponse } from "@/lib/automation/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, queueCreateBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await addTaskToQueueForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedBody.data.taskId,
    parsedBody.data.date,
  );

  if (result.success) {
    return successResponse(result.data, 201);
  }

  return toQueueDashboardAutomationResponse(result);
}
