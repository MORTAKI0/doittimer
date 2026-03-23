import { getAutomationRouteContext, toNotionConnectionAutomationResponse } from "@/lib/automation/notion-route";
import { getNotionConnectionForUser } from "@/lib/services/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const result = await getNotionConnectionForUser(
    context.value.supabase,
    context.value.auth.userId,
  );

  return toNotionConnectionAutomationResponse(result);
}
