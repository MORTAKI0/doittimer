import { getActiveSessionForUser } from "@/lib/services/sessions";
import {
  getAutomationRouteContext,
  toSessionAutomationResponse,
} from "@/lib/automation/session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const result = await getActiveSessionForUser(
    context.value.supabase,
    context.value.auth.userId,
  );

  return toSessionAutomationResponse(result);
}
