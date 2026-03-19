import { getSessionsForUser } from "@/lib/services/sessions";
import {
  getAutomationRouteContext,
  parseSessionFiltersFromRequest,
  toSessionAutomationResponse,
} from "@/lib/automation/session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const filters = parseSessionFiltersFromRequest(request);
  if (!filters.ok) return filters.response;

  const result = await getSessionsForUser(
    context.value.supabase,
    context.value.auth.userId,
    filters.filters,
  );

  return toSessionAutomationResponse(result);
}
