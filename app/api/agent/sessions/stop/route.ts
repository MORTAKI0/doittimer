import { stopSessionForUser } from "@/lib/services/sessions";
import {
  getAutomationRouteContext,
  parseJsonBody,
  stopSessionBodySchema,
  toSessionAutomationResponse,
} from "@/lib/automation/session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, stopSessionBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await stopSessionForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedBody.data.sessionId,
  );

  return toSessionAutomationResponse(result);
}
