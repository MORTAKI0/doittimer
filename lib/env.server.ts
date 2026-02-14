import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  SETTINGS_RPC_DIAG_TIMEOUT_MS: z.string().optional(),
});

const parsed = ServerEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  SETTINGS_RPC_DIAG_TIMEOUT_MS: process.env.SETTINGS_RPC_DIAG_TIMEOUT_MS,
});

if (!parsed.success) {
  console.error(
    "Invalid server environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables. Check .env.local.");
}

export const envServer = parsed.data;
