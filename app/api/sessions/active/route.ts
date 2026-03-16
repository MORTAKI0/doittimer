import { NextResponse } from "next/server";

import { getActiveSession } from "@/app/actions/sessions";
import { logServerDiagnostic } from "@/lib/debug/devDiagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  logServerDiagnostic("api:sessions-active:request", {
    pathname: new URL(request.url).pathname,
    search: new URL(request.url).search,
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });
  const activeSession = await getActiveSession();
  logServerDiagnostic("api:sessions-active:response", {
    hasActiveSession: activeSession != null,
    activeSessionId: activeSession?.id ?? null,
  });
  return NextResponse.json({ activeSession }, { headers: NO_STORE_HEADERS });
}
