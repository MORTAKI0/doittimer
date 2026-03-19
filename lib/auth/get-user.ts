import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type RequireSignedInUserResult =
  | { user: User; error: null }
  | { user: null; error: string };

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function requireSignedInUser(
  supabase: ServerSupabaseClient,
): Promise<RequireSignedInUserResult> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, error: "Tu dois etre connecte." };
  }

  return { user: data.user, error: null };
}
