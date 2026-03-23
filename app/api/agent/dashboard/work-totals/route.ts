import { getWorkTotalsForUser } from "@/lib/services/dashboard";
import {
  getAutomationRouteContext,
  toQueueDashboardAutomationResponse,
} from "@/lib/automation/queue-dashboard-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const result = await getWorkTotalsForUser(
    context.value.supabase,
    context.value.auth.userId,
  );

  return toQueueDashboardAutomationResponse(result);
}
