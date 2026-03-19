import { editSessionForUser } from "@/lib/services/sessions";
import {
  editSessionBodySchema,
  getAutomationRouteContext,
  parseJsonBody,
  toSessionAutomationResponse,
} from "@/lib/automation/session-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, editSessionBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { id } = await params;
  const result = await editSessionForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
    parsedBody.data,
  );

  return toSessionAutomationResponse(result);
}
