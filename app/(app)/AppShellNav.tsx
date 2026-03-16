"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";

import type { ProjectRow } from "@/app/actions/projects";
import {
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";
import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  CommandPalette,
  type CommandAction,
} from "@/components/ui/command-palette";
import {
  IconArchive,
  IconCalendar,
  IconDashboard,
  IconFilter,
  IconFocus,
  IconInbox,
  IconSettings,
  IconTasks,
} from "@/components/ui/icons";

const GlobalRunningSessionWidget = dynamic(
  () =>
    import("./GlobalRunningSessionWidget").then(
      (mod) => mod.GlobalRunningSessionWidget,
    ),
  { ssr: false },
);

const PRIMARY_LINKS = [
  { href: "/inbox", label: "Inbox", Icon: IconInbox, countKey: "inbox" as const },
  { href: "/today", label: "Today", Icon: IconCalendar, countKey: "today" as const },
  { href: "/upcoming", label: "Upcoming", Icon: IconCalendar },
  { href: "/filters-labels", label: "Filters & Labels", Icon: IconFilter },
  { href: "/completed", label: "Completed", Icon: IconArchive },
] as const;

const SECONDARY_LINKS = [
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
] as const;

const MOBILE_LINKS = [
  { href: "/today", label: "Today", Icon: IconCalendar },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

function UserAvatar({ email }: { email: string | null }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : "U";

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
      {initials}
    </span>
  );
}

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
  activeSession: { id: string; started_at: string } | null;
};

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function logNavClick(label: string, href: string, pathname: string) {
  logClientDiagnostic("nav:click", {
    label,
    href,
    pathnameBeforeClick: pathname,
    ...getClientRuntimeSnapshot(),
  });
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjects = projects.filter((project) => !project.archived_at);
  const activeProjectId = searchParams.get("project");
  const settingsActive = isRouteActive(pathname, "/settings");

  const commandActions: CommandAction[] = [
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
    { id: "quick-start-focus", label: "Start focus", href: "/focus", hint: "Quick action" },
  ];

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <CommandPalette actions={commandActions} />
      <GlobalRunningSessionWidget activeSession={activeSession} userId={userId} />
      <div className="mx-auto grid min-h-dvh w-full max-w-[1680px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:px-6">
        <aside className="app-sidebar hidden lg:block">
          <div className="sticky top-0 flex h-dvh flex-col px-3 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <span className="inline-flex items-center gap-1 rounded-md border-[0.5px] border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </span>
            </div>

            <div className="mt-6">
              <Link
                href="/tasks?compose=1"
                className="nav-action-link focus-ring"
                onClick={() => logNavClick("Add task", "/tasks?compose=1", pathname)}
              >
                <span className="nav-action-icon text-base leading-none text-current" aria-hidden="true">
                  +
                </span>
                <span>Add task</span>
              </Link>
            </div>

            <hr className="sidebar-divider" />

            <nav className="space-y-1" aria-label="Main navigation">
              {PRIMARY_LINKS.map((link) => {
                const isActive = isRouteActive(pathname, link.href);
                const count = "countKey" in link
                  ? link.countKey === "inbox"
                    ? inboxCount
                    : todayCount
                  : null;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={["nav-link focus-ring", isActive ? "nav-link-active" : ""].join(" ")}
                    onClick={() => logNavClick(link.label, link.href, pathname)}
                  >
                    <link.Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{link.label}</span>
                    {typeof count === "number" ? <span className="nav-link-count">{count}</span> : null}
                  </Link>
                );
              })}

              <hr className="sidebar-divider" />

              {SECONDARY_LINKS.map((link) => {
                const isActive = isRouteActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={["nav-link focus-ring", isActive ? "nav-link-active" : ""].join(" ")}
                    onClick={() => logNavClick(link.label, link.href, pathname)}
                  >
                    <link.Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{link.label}</span>
                    {link.href === "/focus" && queueCount > 0 ? (
                      <span className="nav-link-count">{Math.min(queueCount, 99)}</span>
                    ) : null}
                  </Link>
                );
              })}

              <hr className="sidebar-divider" />

              <div className="space-y-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  My Projects
                </p>
                {activeProjects.map((project) => {
                  const href = `/tasks?project=${project.id}`;
                  const isActive = pathname === "/tasks" && activeProjectId === project.id;
                  const count = projectCounts[project.id] ?? 0;

                  return (
                    <Link
                      key={project.id}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={["nav-link focus-ring", isActive ? "nav-link-active" : ""].join(" ")}
                      onClick={() => logNavClick(project.name, href, pathname)}
                    >
                      <span className="text-base leading-none text-muted-foreground" aria-hidden="true">
                        #
                      </span>
                      <span className="truncate">{project.name}</span>
                      {count > 0 ? <span className="nav-link-count">{count}</span> : null}
                    </Link>
                  );
                })}
                <Link
                  href="/tasks#projects-panel"
                  className="nav-action-link focus-ring"
                  onClick={() => logNavClick("Add project", "/tasks#projects-panel", pathname)}
                >
                  <span className="nav-action-icon text-base leading-none text-current" aria-hidden="true">
                    +
                  </span>
                  <span>Add project</span>
                </Link>
              </div>
            </nav>

            <div className="mt-auto space-y-3">
              {hasActiveFocus ? (
                <Link
                  href="/focus"
                  className="sidebar-focus-indicator focus-ring ui-hover animate-fadeIn block"
                  onClick={() => logNavClick("Focus running", "/focus", pathname)}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="animate-pulse-soft h-2 w-2 rounded-full bg-[var(--ring)]" />
                    Focus running
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span>Active session</span>
                    <span className="numeric-tabular">Live</span>
                  </div>
                </Link>
              ) : null}

              <div className="flex items-center gap-2 rounded-md border-[0.5px] border-border bg-card px-3 py-2">
                <Link
                  href="/settings"
                  aria-label="Open settings"
                  className={[
                    "focus-ring ui-hover flex min-w-0 flex-1 items-center gap-2 rounded-md",
                    settingsActive ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "",
                  ].join(" ")}
                  onClick={() => logNavClick("Settings", "/settings", pathname)}
                >
                  <UserAvatar email={userEmail} />
                  <p className="truncate text-xs text-muted-foreground">
                    {userEmail ?? "Signed in"}
                  </p>
                </Link>
                <ThemeToggle initialTheme={initialTheme} />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col">
          <header className="border-border/80 bg-background/88 sticky top-0 z-30 border-b backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Brand />
              <div className="flex items-center gap-2">
                <Link
                  href="/tasks?compose=1"
                  className="nav-action-link focus-ring min-h-0 px-3 py-2 text-sm"
                  onClick={() => logNavClick("Add task mobile", "/tasks?compose=1", pathname)}
                >
                  <span className="nav-action-icon text-base leading-none text-current" aria-hidden="true">
                    +
                  </span>
                  <span>Add task</span>
                </Link>
                {hasActiveFocus ? (
                  <Link
                    href="/focus"
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--nav-active-bg)] px-2 py-1 text-xs text-[var(--nav-active-text)]"
                    onClick={() => logNavClick("Running mobile", "/focus", pathname)}
                  >
                    <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-[var(--ring)]" />
                    Running
                  </Link>
                ) : null}
                <ThemeToggle initialTheme={initialTheme} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:py-8 lg:pb-8">
            {children}
          </main>

          <nav className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-border bg-card/95 p-1 shadow-[var(--shadow-lift)] backdrop-blur lg:hidden" aria-label="Bottom navigation">
            <ul className="grid grid-cols-5 gap-1">
              {MOBILE_LINKS.map((link) => {
                const isActive = isRouteActive(pathname, link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "ui-hover relative flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium",
                        isActive
                          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                      onClick={() => logNavClick(`mobile:${link.label}`, link.href, pathname)}
                    >
                      <link.Icon className="h-4 w-4" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
