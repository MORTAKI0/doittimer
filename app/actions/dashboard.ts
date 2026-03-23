"use server";

import { redirect } from "next/navigation";

import {
  getDashboardOptimizedScreenForUser,
  getDashboardSummaryForUser,
  getWorkTotalsForUser,
  type DashboardOptimizedScreen,
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
    userEmail: userData.user.email ?? null,
    userDisplayName:
      typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name
        : typeof userData.user.user_metadata?.name === "string"
          ? userData.user.user_metadata.name
          : null,
  };
}

export type {
  DashboardOptimizedScreen,
  DashboardRange,
  DashboardSummary,
  QueueItemLite,
  TaskLite,
  WorkTotals,
};

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

export async function getDashboardOptimizedScreenData(): Promise<DashboardOptimizedScreen> {
  const auth = await requireDashboardAuth();
  const result = await getDashboardOptimizedScreenForUser(
    auth.supabase,
    auth.userId,
    auth.userEmail,
    auth.userDisplayName,
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
