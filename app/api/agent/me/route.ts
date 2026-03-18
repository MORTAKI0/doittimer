import { requireAutomationAuth } from "@/lib/automation/auth";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const auth = await requireAutomationAuth(request);

    if (!auth) {
      return errorResponse(
        AUTOMATION_ERROR_CODES.unauthorized,
        "Unauthorized",
        401,
      );
    }

    return successResponse({
      userId: auth.userId,
      scopes: auth.scopes,
    });
  } catch {
    return errorResponse(
      AUTOMATION_ERROR_CODES.internalError,
      "Automation authentication is unavailable.",
      500,
    );
  }
}
