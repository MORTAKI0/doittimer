import { successResponse } from "@/lib/automation/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return successResponse({
    service: "doittimer",
    version: "v1",
    status: "ok",
  });
}
