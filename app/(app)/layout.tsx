import { redirect } from "next/navigation";

import { getTheme } from "@/app/actions/theme";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { AppShellNav } from "./AppShellNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatPhaseLabel(phase: string | null) {
  if (!phase) return null;
  if (phase === "short_break") return "Short break";
  if (phase === "long_break") return "Long break";
  return "Work";
}

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
  const [{ data: queueData }, { data: activeData }] = await Promise.all([
    supabase.rpc("task_queue_list"),
    supabase.rpc("get_active_session_v2"),
  ]);

  const queueCount = Array.isArray(queueData) ? queueData.length : queueData ? 1 : 0;
  const activeSession = Array.isArray(activeData) ? (activeData[0] ?? null) : activeData;
  const activeFocusStartedAt = typeof activeSession?.started_at === "string" ? activeSession.started_at : null;
  const activeFocusPhaseLabel = formatPhaseLabel(
    typeof activeSession?.pomodoro_phase === "string" ? activeSession.pomodoro_phase : null,
  );

  return (
    <AppShellNav
      initialTheme={initialTheme}
      userEmail={user.email ?? null}
      queueCount={queueCount}
      hasActiveFocus={Boolean(activeSession)}
      activeFocusPhaseLabel={activeFocusPhaseLabel}
      activeFocusStartedAt={activeFocusStartedAt}
    >
      {children}
    </AppShellNav>
  );
}
