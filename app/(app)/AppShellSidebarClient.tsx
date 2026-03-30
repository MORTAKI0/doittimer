"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { ProjectRow } from "@/app/actions/projects";
import {
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  IconArchive,
  IconCalendar,
  IconDashboard,
  IconFilter,
  IconFocus,
  IconHome,
  IconInbox,
} from "@/components/ui/icons";

const PRIMARY_LINKS = [
  {
    href: "/home",
    label: "Home",
    Icon: IconHome,
    prefetch: true,
  },
  {
    href: "/inbox",
    label: "Inbox",
    Icon: IconInbox,
    countKey: "inbox" as const,
    prefetch: true,
  },
  {
    href: "/today",
    label: "Today",
    Icon: IconCalendar,
    countKey: "today" as const,
    prefetch: true,
  },
  { href: "/upcoming", label: "Upcoming", Icon: IconCalendar, prefetch: true },
  { href: "/filters-labels", label: "Filters & Labels", Icon: IconFilter, prefetch: true },
  { href: "/completed", label: "Completed", Icon: IconArchive, prefetch: true },
] as const;

const SECONDARY_LINKS = [
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
] as const;

type SidebarNavItemProps = {
  href: string;
  label: string;
  pathname: string;
  onClick: (label: string, href: string, pathname: string) => void;
  count?: number | null;
  icon?: React.ReactNode;
  isActiveOverride?: boolean;
  isLoading?: boolean;
  prefetch?: boolean;
  truncateLabel?: boolean;
};

type AppShellSidebarClientProps = {
  initialTheme: "light" | "dark";
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

function UserAvatar({ email }: { email: string | null }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : "U";

  return <span className="app-shell-avatar">{initials}</span>;
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
  isLoading = false,
  prefetch,
  truncateLabel = false,
}: SidebarNavItemProps) {
  const isActive = isActiveOverride ?? isRouteActive(pathname, href);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={isActive ? "page" : undefined}
      data-loading={isLoading ? "true" : undefined}
      className={[
        "app-shell-nav-item focus-ring ui-hover",
        isActive ? "app-shell-nav-item-active" : "",
      ].join(" ")}
      onClick={() => onClick(label, href, pathname)}
    >
      <span
        className={[
          "app-shell-nav-icon-wrap",
          isActive ? "app-shell-nav-icon-wrap-active" : "",
        ].join(" ")}
      >
        {isLoading ? (
          <span className="app-shell-nav-icon-shimmer shimmer" aria-hidden="true" />
        ) : (
          icon ?? null
        )}
      </span>
      <span className={truncateLabel ? "truncate" : ""}>{label}</span>
      {typeof count === "number" ? (
        <span
          className={[
            "app-shell-nav-item-count",
            count > 0 ? "app-shell-nav-item-count-visible" : "",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarFooter({
  pathname,
  hasActiveFocus,
  activeSession,
  settingsActive,
  userEmail,
  initialTheme,
  onNavClick,
}: {
  pathname: string;
  hasActiveFocus: boolean;
  activeSession: AppShellSidebarClientProps["activeSession"];
  settingsActive: boolean;
  userEmail: string | null;
  initialTheme: "light" | "dark";
  onNavClick: (label: string, href: string, pathname: string) => void;
}) {
  const activeLabel = activeSession?.taskTitle ?? activeSession?.projectName ?? null;
  const activePrefix = activeSession?.taskTitle
    ? "Task"
    : activeSession?.projectName
      ? "Project"
      : "Session";

  return (
    <div className="app-shell-sidebar-footer">
      <Link
        href="/focus"
        className="app-shell-quick-action focus-ring ui-hover"
        onClick={() => onNavClick("Quick start", "/focus", pathname)}
      >
        <span className="app-shell-quick-action-icon" aria-hidden="true">
          +
        </span>
        <span>Track time</span>
      </Link>

      {hasActiveFocus ? (
        <Link
          href="/focus"
          className="app-shell-focus-card focus-ring ui-hover animate-fadeIn"
          onClick={() => onNavClick("Focus running", "/focus", pathname)}
        >
          <div className="app-shell-focus-card-header">
            <span className="animate-pulse-soft app-shell-focus-dot" />
            <span>Session running</span>
          </div>
          <div className="app-shell-focus-card-meta">
            <span>{activeLabel ? `${activePrefix}: ${activeLabel}` : "Active session"}</span>
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
          onClick={() => onNavClick("Settings", "/settings", pathname)}
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

export function AppShellSidebarClient({
  initialTheme,
  userEmail,
  queueCount,
  inboxCount,
  todayCount,
  projects,
  projectCounts,
  hasActiveFocus,
  activeSession,
}: AppShellSidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");
  const settingsActive = isRouteActive(pathname, "/settings");
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const navigationKey = React.useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  React.useEffect(() => {
    setPendingHref(null);
  }, [navigationKey]);

  const handleNavClick = React.useCallback(
    (label: string, href: string, currentPathname: string) => {
      setPendingHref((currentPathname === href ? null : href));
      logNavClick(label, href, currentPathname);
    },
    [],
  );

  return (
    <>
      <div className="app-shell-sidebar-scroll">
        <nav className="app-shell-sidebar-nav" aria-label="Main navigation">
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
                    onClick={handleNavClick}
                    count={typeof count === "number" ? count : null}
                    isLoading={pendingHref === link.href}
                    prefetch={link.prefetch}
                    icon={<link.Icon className="h-[15px] w-[15px]" aria-hidden="true" />}
                  />
                );
              })}
            </div>
          </div>

          <div className="app-shell-section">
            <SidebarSectionLabel>Spaces</SidebarSectionLabel>
            <div className="app-shell-nav-list">
              {SECONDARY_LINKS.map((link) => (
                <SidebarNavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  pathname={pathname}
                  onClick={handleNavClick}
                  count={link.href === "/focus" && queueCount > 0 ? Math.min(queueCount, 99) : null}
                  icon={<link.Icon className="h-[15px] w-[15px]" aria-hidden="true" />}
                />
              ))}
            </div>
          </div>

          <div className="app-shell-section app-shell-projects-section">
            <div className="app-shell-section-header">
              <SidebarSectionLabel>My Projects</SidebarSectionLabel>
              <span className="app-shell-section-meta">{projects.length}</span>
            </div>
            <div className="app-shell-nav-list">
              {projects.map((project) => {
                const href = `/tasks?project=${project.id}`;
                const count = projectCounts[project.id] ?? 0;

                return (
                  <SidebarNavItem
                    key={project.id}
                    href={href}
                    label={project.name}
                    pathname={pathname}
                    onClick={handleNavClick}
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
                onClick={() => handleNavClick("Add project", "/tasks#projects-panel", pathname)}
              >
                <span className="app-shell-nav-action-icon" aria-hidden="true">
                  +
                </span>
                <span>Add project</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>

      <SidebarFooter
        pathname={pathname}
        hasActiveFocus={hasActiveFocus}
        activeSession={activeSession}
        settingsActive={settingsActive}
        userEmail={userEmail}
        initialTheme={initialTheme}
        onNavClick={handleNavClick}
      />
    </>
  );
}
