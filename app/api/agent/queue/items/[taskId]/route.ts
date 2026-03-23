import { removeTaskFromQueueForUser } from "@/lib/services/queue";
import {
  getAutomationRouteContext,
  parseQueueDateFromRequest,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedQuery = parseQueueDateFromRequest(request);
  if (!parsedQuery.ok) return parsedQuery.response;

  const { taskId } = await params;
  const result = await removeTaskFromQueueForUser(
    context.value.supabase,
    context.value.auth.userId,
    taskId,
    parsedQuery.queueDate,
  );

  return toQueueDashboardAutomationResponse(result);
}
