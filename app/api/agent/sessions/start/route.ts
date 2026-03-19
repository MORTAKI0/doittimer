import { startSessionForUser } from "@/lib/services/sessions";
import {
  createSessionSuccessResponse,
  getAutomationRouteContext,
  parseJsonBody,
  startSessionBodySchema,
  toSessionAutomationResponse,
} from "@/lib/automation/session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, startSessionBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await startSessionForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedBody.data,
  );

  if (!result.success) {
    return toSessionAutomationResponse(result);
  }

  return createSessionSuccessResponse(result.data);
}
