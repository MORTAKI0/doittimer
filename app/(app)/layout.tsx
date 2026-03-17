import { redirect } from "next/navigation";

import { getActiveSession } from "@/app/actions/sessions";
import { getProjects } from "@/app/actions/projects";
import { getTaskNavigationSummary } from "@/app/actions/tasks";
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
  const [{ data: queueData }, activeSession, projectsResult, navigationSummaryResult] = await Promise.all([
    supabase.rpc("task_queue_list"),
    getActiveSession(),
    getProjects(),
    getTaskNavigationSummary(),
  ]);

  const queueCount = Array.isArray(queueData)
    ? queueData.length
    : queueData
      ? 1
      : 0;
  const projects = projectsResult.success ? projectsResult.data : [];
  const navigationSummary = navigationSummaryResult.success
    ? navigationSummaryResult.data
    : { inboxCount: 0, todayCount: 0, projectCounts: {} };

  return (
    <AppShellNav
      initialTheme={initialTheme}
      userId={user.id}
      userEmail={user.email ?? null}
      queueCount={queueCount}
      inboxCount={navigationSummary.inboxCount}
      todayCount={navigationSummary.todayCount}
      projects={projects}
      projectCounts={navigationSummary.projectCounts}
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
