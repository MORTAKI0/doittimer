"use server";

import { redirect } from "next/navigation";

import {
  getDashboardSummaryForUser,
  getWorkTotalsForUser,
  type DashboardRange,
  type DashboardSummary,
  type QueueItemLite,
  type TaskLite,
  type WorkTotals,
} from "@/lib/services/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireDashboardAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  return {
    supabase,
    userId: userData.user.id,
  };
}

export type { DashboardRange, DashboardSummary, QueueItemLite, TaskLite, WorkTotals };

export async function getWorkTotals(): Promise<WorkTotals> {
  const auth = await requireDashboardAuth();
  const result = await getWorkTotalsForUser(auth.supabase, auth.userId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getDashboardSummary(input: {
  range: DashboardRange;
  from?: string;
  to?: string;
}): Promise<DashboardSummary> {
  const auth = await requireDashboardAuth();
  const result = await getDashboardSummaryForUser(
    auth.supabase,
    auth.userId,
    input.range,
    input.from,
    input.to,
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
