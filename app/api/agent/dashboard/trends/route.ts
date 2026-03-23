import { getDashboardTrendsForUser } from "@/lib/services/dashboard";
import {
  getAutomationRouteContext,
  parseDashboardTrendsQueryFromRequest,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedQuery = parseDashboardTrendsQueryFromRequest(request);
  if (!parsedQuery.ok) return parsedQuery.response;

  const result = await getDashboardTrendsForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedQuery.days,
  );

  return toQueueDashboardAutomationResponse(result);
}
