import * as React from "react";

import type { ProjectRow } from "@/app/actions/projects";
import { AddTaskLauncher } from "@/app/(app)/tasks/components/AddTaskLauncher";
import { Brand } from "@/components/layout/Brand";
import {
  CommandPalette,
  type CommandAction,
} from "@/components/ui/command-palette";
import { GlobalRunningSessionWidget } from "./GlobalRunningSessionWidget";
import { AppShellMobileNav } from "./AppShellMobileNav";
import { AppShellSidebarClient } from "./AppShellSidebarClient";

type AppShellNavProps = {
  children: React.ReactNode;
  initialTheme: "light" | "dark";
  userId: string;
  userEmail: string | null;
  queueCount: number;
  inboxCount: number;
  todayCount: number;
  projects: ProjectRow[];
  projectCounts: Record<string, number>;
  hasActiveFocus: boolean;
  activeSession: {
    id: string;
    started_at: string;
    taskId: string | null;
    projectId: string | null;
    taskTitle: string | null;
    projectName: string | null;
  } | null;
};

const COMMAND_ACTIONS: CommandAction[] = [
  { id: "nav-home", label: "Go to Home", href: "/home", hint: "Navigation" },
  { id: "nav-inbox", label: "Go to Inbox", href: "/inbox", hint: "Navigation" },
  { id: "nav-today", label: "Go to Today", href: "/today", hint: "Navigation" },
  { id: "nav-upcoming", label: "Go to Upcoming", href: "/upcoming", hint: "Navigation" },
  { id: "nav-tasks", label: "Go to Tasks", href: "/tasks", hint: "Navigation" },
  { id: "nav-focus", label: "Go to Focus", href: "/focus", hint: "Navigation" },
  { id: "nav-dashboard", label: "Go to Dashboard", href: "/dashboard", hint: "Navigation" },
  { id: "nav-filters", label: "Go to Filters & Labels", href: "/filters-labels", hint: "Navigation" },
  { id: "nav-completed", label: "Go to Completed", href: "/completed", hint: "Navigation" },
  { id: "nav-settings", label: "Go to Settings", href: "/settings", hint: "Navigation" },
  { id: "quick-create-task", label: "Create task", href: "/tasks?compose=1", hint: "Quick action" },
  { id: "quick-start-focus", label: "Track time", href: "/focus", hint: "Quick action" },
];

export function AppShellNav({
  children,
  initialTheme,
  userId,
  userEmail,
  queueCount,
  inboxCount,
  todayCount,
  projects,
  projectCounts,
  hasActiveFocus,
  activeSession,
}: AppShellNavProps) {
  const activeProjects = projects.filter((project) => !project.archived_at);

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <CommandPalette actions={COMMAND_ACTIONS} />
      <GlobalRunningSessionWidget activeSession={activeSession} userId={userId} />
      <div className="app-shell-frame grid min-h-dvh w-full grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)]">
        <aside className="app-sidebar hidden lg:block">
          <div className="app-shell-sidebar-inner">
            <div className="app-shell-sidebar-header">
              <Brand variant="shell" />
              <span className="app-shell-kbd">⌘K</span>
            </div>

            <div className="app-shell-add-task-row">
              <AddTaskLauncher
                projects={activeProjects}
                variant="nav"
                className="app-shell-nav-action app-shell-primary-action min-h-0 border-0 px-0 py-0 text-sm"
              />
            </div>

            <AppShellSidebarClient
              initialTheme={initialTheme}
              userEmail={userEmail}
              queueCount={queueCount}
              inboxCount={inboxCount}
              todayCount={todayCount}
              projects={activeProjects}
              projectCounts={projectCounts}
              hasActiveFocus={hasActiveFocus}
              activeSession={activeSession}
            />
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col">
          <AppShellMobileNav
            initialTheme={initialTheme}
            projects={activeProjects}
            hasActiveFocus={hasActiveFocus}
            activeSession={activeSession}
          />

          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:py-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
