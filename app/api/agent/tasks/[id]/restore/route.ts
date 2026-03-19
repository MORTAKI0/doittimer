import { restoreTaskForUser } from "@/lib/services/tasks";
import {
  getAutomationRouteContext,
  toAutomationErrorResponse,
} from "@/lib/automation/task-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAutomationRouteContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  const result = await restoreTaskForUser(
    context.value.supabase,
    context.value.auth.userId,
    id,
  );

  return toAutomationErrorResponse(result);
}
