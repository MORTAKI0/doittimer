import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { envServer } from "@/lib/env.server";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    envServer.NEXT_PUBLIC_SUPABASE_URL,
    envServer.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can be called from Server Components where cookies are read-only.
          // It's safe to ignore there if you only need to read the session.
        }
      },
    },
    },
  );
}

declare global {
  var __doittimerSupabaseAdminClient: SupabaseClient | undefined;
}

export function createSupabaseAdminClient() {
  if (!envServer.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for automation endpoints.");
  }

  if (!globalThis.__doittimerSupabaseAdminClient) {
    globalThis.__doittimerSupabaseAdminClient = createClient(
      envServer.NEXT_PUBLIC_SUPABASE_URL,
      envServer.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return globalThis.__doittimerSupabaseAdminClient;
}
