import { getDashboardSummaryForUser } from "@/lib/services/dashboard";
import {
  getAutomationRouteContext,
  parseDashboardSummaryQueryFromRequest,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedQuery = parseDashboardSummaryQueryFromRequest(request);
  if (!parsedQuery.ok) return parsedQuery.response;

  const result = await getDashboardSummaryForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedQuery.value.range,
    parsedQuery.value.from,
    parsedQuery.value.to,
  );

  return toQueueDashboardAutomationResponse(result);
}
