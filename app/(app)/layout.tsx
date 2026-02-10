import { redirect } from "next/navigation";

import { getActiveSession } from "@/app/actions/sessions";
import { getTheme } from "@/app/actions/theme";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { AppShellNav } from "./AppShellNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const theme = await getTheme();
  const initialTheme = theme === "dark" ? "dark" : "light";

  const supabase = await createSupabaseServerClient();
  const [{ data: queueData }, activeSession] = await Promise.all([
    supabase.rpc("task_queue_list"),
    getActiveSession(),
  ]);

  const queueCount = Array.isArray(queueData)
    ? queueData.length
    : queueData
      ? 1
      : 0;
  return (
    <AppShellNav
      initialTheme={initialTheme}
      userEmail={user.email ?? null}
      queueCount={queueCount}
      hasActiveFocus={Boolean(activeSession)}
      activeSession={
        activeSession
          ? { id: activeSession.id, started_at: activeSession.started_at }
          : null
      }
    >
      {children}
    </AppShellNav>
  );
}
