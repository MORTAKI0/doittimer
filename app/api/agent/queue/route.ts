import { getTaskQueueForUser } from "@/lib/services/queue";
import {
  getAutomationRouteContext,
  parseQueueDateFromRequest,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedQuery = parseQueueDateFromRequest(request);
  if (!parsedQuery.ok) return parsedQuery.response;

  const result = await getTaskQueueForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedQuery.queueDate,
  );

  return toQueueDashboardAutomationResponse(result);
}
