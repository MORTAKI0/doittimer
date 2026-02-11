import { NextResponse } from "next/server";

import { getActiveSession } from "@/app/actions/sessions";

export const runtime = "nodejs";

export async function GET() {
  const activeSession = await getActiveSession();
  return NextResponse.json({ activeSession });
}
