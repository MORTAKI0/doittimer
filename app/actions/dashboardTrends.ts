"use server";

import {
  getDashboardTrendsForUser,
  type DashboardTrends,
  type TrendPoint,
} from "@/lib/services/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ERROR_SIGN_IN = "You must be signed in.";

export type { DashboardTrends, TrendPoint };

export async function getDashboardTrends(input: {
  days: 7 | 30;
}): Promise<ActionResult<DashboardTrends>> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { success: false, error: ERROR_SIGN_IN };
  }

  return getDashboardTrendsForUser(supabase, userData.user.id, input.days);
}
