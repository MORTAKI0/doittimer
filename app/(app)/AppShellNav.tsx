"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";

import type { ProjectRow } from "@/app/actions/projects";
import { AddTaskLauncher } from "@/app/(app)/tasks/components/AddTaskLauncher";
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

type SidebarNavItemProps = {
  href: string;
  label: string;
  pathname: string;
  onClick: (label: string, href: string, pathname: string) => void;
  count?: number | null;
  icon?: React.ReactNode;
  isActiveOverride?: boolean;
  truncateLabel?: boolean;
};

function UserAvatar({ email }: { email: string | null }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : "U";

  return (
    <span className="app-shell-avatar">
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

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="app-shell-section-label">{children}</p>;
}

function SidebarNavItem({
  href,
  label,
  pathname,
  onClick,
  count = null,
  icon,
  isActiveOverride,
  truncateLabel = false,
}: SidebarNavItemProps) {
  const isActive = isActiveOverride ?? isRouteActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        "app-shell-nav-item focus-ring ui-hover",
        isActive ? "app-shell-nav-item-active" : "",
      ].join(" ")}
      onClick={() => onClick(label, href, pathname)}
    >
      <span className={["app-shell-nav-icon-wrap", isActive ? "app-shell-nav-icon-wrap-active" : ""].join(" ")}>
        {icon ?? null}
      </span>
      <span className={truncateLabel ? "truncate" : ""}>{label}</span>
      {typeof count === "number" ? (
        <span className={["app-shell-nav-item-count", count > 0 ? "app-shell-nav-item-count-visible" : ""].join(" ")}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarPrimaryNav({
  pathname,
  inboxCount,
  todayCount,
}: {
  pathname: string;
  inboxCount: number;
  todayCount: number;
}) {
  return (
    <div className="app-shell-section">
      <SidebarSectionLabel>Workspace</SidebarSectionLabel>
      <div className="app-shell-nav-list">
        {PRIMARY_LINKS.map((link) => {
          const count = "countKey" in link
            ? link.countKey === "inbox"
              ? inboxCount
              : todayCount
            : null;

          return (
            <SidebarNavItem
              key={link.href}
              href={link.href}
              label={link.label}
              pathname={pathname}
              onClick={logNavClick}
              count={typeof count === "number" ? count : null}
              icon={<link.Icon className="h-[15px] w-[15px]" aria-hidden="true" />}
            />
          );
        })}
      </div>
    </div>
  );
}

function SidebarSecondaryNav({
  pathname,
  queueCount,
}: {
  pathname: string;
  queueCount: number;
}) {
  return (
    <div className="app-shell-section">
      <SidebarSectionLabel>Spaces</SidebarSectionLabel>
      <div className="app-shell-nav-list">
        {SECONDARY_LINKS.map((link) => (
          <SidebarNavItem
            key={link.href}
            href={link.href}
            label={link.label}
            pathname={pathname}
            onClick={logNavClick}
            count={link.href === "/focus" && queueCount > 0 ? Math.min(queueCount, 99) : null}
            icon={<link.Icon className="h-[15px] w-[15px]" aria-hidden="true" />}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarProjectsSection({
  pathname,
  activeProjectId,
  activeProjects,
  projectCounts,
}: {
  pathname: string;
  activeProjectId: string | null;
  activeProjects: ProjectRow[];
  projectCounts: Record<string, number>;
}) {
  return (
    <div className="app-shell-section app-shell-projects-section">
      <div className="app-shell-section-header">
        <SidebarSectionLabel>My Projects</SidebarSectionLabel>
        <span className="app-shell-section-meta">{activeProjects.length}</span>
      </div>
      <div className="app-shell-nav-list">
        {activeProjects.map((project) => {
          const href = `/tasks?project=${project.id}`;
          const count = projectCounts[project.id] ?? 0;

          return (
            <SidebarNavItem
              key={project.id}
              href={href}
              label={project.name}
              pathname={pathname}
              onClick={logNavClick}
              count={count > 0 ? count : null}
              truncateLabel
              isActiveOverride={pathname === "/tasks" && activeProjectId === project.id}
              icon={<span className="app-shell-project-marker" aria-hidden="true" />}
            />
          );
        })}
        <Link
          href="/tasks#projects-panel"
          className="app-shell-nav-action focus-ring ui-hover"
          onClick={() => logNavClick("Add project", "/tasks#projects-panel", pathname)}
        >
          <span className="app-shell-nav-action-icon" aria-hidden="true">
            +
          </span>
          <span>Add project</span>
        </Link>
      </div>
    </div>
  );
}

function SidebarFooter({
  pathname,
  hasActiveFocus,
  settingsActive,
  userEmail,
  initialTheme,
}: {
  pathname: string;
  hasActiveFocus: boolean;
  settingsActive: boolean;
  userEmail: string | null;
  initialTheme: "light" | "dark";
}) {
  return (
    <div className="app-shell-sidebar-footer">
      <Link
        href="/focus"
        className="app-shell-quick-action focus-ring ui-hover"
        onClick={() => logNavClick("Quick start", "/focus", pathname)}
      >
        <span className="app-shell-quick-action-icon" aria-hidden="true">+</span>
        <span>Quick Start</span>
      </Link>

      {hasActiveFocus ? (
        <Link
          href="/focus"
          className="app-shell-focus-card focus-ring ui-hover animate-fadeIn"
          onClick={() => logNavClick("Focus running", "/focus", pathname)}
        >
          <div className="app-shell-focus-card-header">
            <span className="animate-pulse-soft app-shell-focus-dot" />
            <span>Focus running</span>
          </div>
          <div className="app-shell-focus-card-meta">
            <span>Active session</span>
            <span className="numeric-tabular">Live</span>
          </div>
        </Link>
      ) : null}

      <div className="app-shell-footer-card">
        <Link
          href="/settings"
          aria-label="Open settings"
          className={[
            "app-shell-profile-link focus-ring ui-hover",
            settingsActive ? "app-shell-profile-link-active" : "",
          ].join(" ")}
          onClick={() => logNavClick("Settings", "/settings", pathname)}
        >
          <UserAvatar email={userEmail} />
          <span className="app-shell-profile-meta">
            <span className="app-shell-profile-title">Workspace</span>
            <span className="app-shell-profile-subtitle">{userEmail ?? "Signed in"}</span>
          </span>
        </Link>
        <ThemeToggle initialTheme={initialTheme} className="app-shell-theme-toggle" />
      </div>
    </div>
  );
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
  const isDashboardRoute = pathname === "/dashboard";

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
      <div
        className={[
          "app-shell-frame min-h-dvh w-full",
          isDashboardRoute
            ? "flex"
            : "grid grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)]",
        ].join(" ")}
      >
        {isDashboardRoute ? (
          <main className="dashboard-route-main flex-1">
            {children}
          </main>
        ) : (
          <>
            <aside className="app-sidebar hidden lg:block">
              <div className="app-shell-sidebar-inner">
                <div className="app-shell-sidebar-header">
                  <Brand variant="shell" />
                  <span className="app-shell-kbd">
                    ⌘K
                  </span>
                </div>

                <div className="app-shell-add-task-row">
                  <AddTaskLauncher
                    projects={activeProjects}
                    variant="nav"
                    className="app-shell-nav-action app-shell-primary-action min-h-0 border-0 px-0 py-0 text-sm"
                  />
                </div>

                <div className="app-shell-sidebar-scroll">
                  <nav className="app-shell-sidebar-nav" aria-label="Main navigation">
                    <SidebarPrimaryNav
                      pathname={pathname}
                      inboxCount={inboxCount}
                      todayCount={todayCount}
                    />
                    <SidebarSecondaryNav pathname={pathname} queueCount={queueCount} />
                    <SidebarProjectsSection
                      pathname={pathname}
                      activeProjectId={activeProjectId}
                      activeProjects={activeProjects}
                      projectCounts={projectCounts}
                    />
                  </nav>
                </div>

                <SidebarFooter
                  pathname={pathname}
                  hasActiveFocus={hasActiveFocus}
                  settingsActive={settingsActive}
                  userEmail={userEmail}
                  initialTheme={initialTheme}
                />
              </div>
            </aside>

            <div className="flex min-h-dvh flex-col">
              <header className="border-border/80 bg-background/88 sticky top-0 z-30 border-b backdrop-blur lg:hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <Brand />
                  <div className="flex items-center gap-2">
                    <AddTaskLauncher
                      projects={activeProjects}
                      variant="nav"
                      className="min-h-0 px-3 py-2 text-sm"
                    />
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
          </>
        )}
      </div>
    </div>
  );
}
