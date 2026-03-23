import {
  getAutomationRouteContext,
  parseJsonBody,
  settingsAgentPatchSchema,
  toSettingsAutomationResponse,
} from "@/lib/automation/settings-route";
import {
  getUserSettingsForUser,
  upsertUserSettingsForUser,
} from "@/lib/services/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const result = await getUserSettingsForUser(
    context.value.supabase,
    context.value.auth.userId,
  );

  return toSettingsAutomationResponse(result);
}

export async function PATCH(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const parsedBody = await parseJsonBody(request, settingsAgentPatchSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await upsertUserSettingsForUser(
    context.value.supabase,
    context.value.auth.userId,
    parsedBody.data,
  );

  return toSettingsAutomationResponse(result);
}
