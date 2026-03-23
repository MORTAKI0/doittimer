import { getAutomationRouteContext, toNotionSyncAutomationResponse } from "@/lib/automation/notion-route";
import { runNotionImportForUser } from "@/lib/services/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NOTION_SYNC_RATE_LIMIT = {
  scope: "agent.notion.sync",
  limit: 5,
  windowMs: 60_000,
} as const;

export async function POST(request: Request) {
  const context = await getAutomationRouteContext(request, {
    rateLimit: NOTION_SYNC_RATE_LIMIT,
  });
  if (!context.ok) return context.response;

  const result = await runNotionImportForUser(
    context.value.supabase,
    context.value.auth.userId,
  );

  return toNotionSyncAutomationResponse(result);
}
