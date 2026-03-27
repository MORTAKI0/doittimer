"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ProjectRow } from "@/app/actions/projects";
import { AddTaskLauncher } from "@/app/(app)/tasks/components/AddTaskLauncher";
import {
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";
import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  IconCalendar,
  IconDashboard,
  IconFocus,
  IconHome,
  IconSettings,
  IconTasks,
} from "@/components/ui/icons";

const MOBILE_LINKS = [
  { href: "/home", label: "Home", Icon: IconHome },
  { href: "/today", label: "Today", Icon: IconCalendar },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

type AppShellMobileNavProps = {
  initialTheme: "light" | "dark";
  projects: ProjectRow[];
  hasActiveFocus: boolean;
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

export function AppShellMobileNav({
  initialTheme,
  projects,
  hasActiveFocus,
}: AppShellMobileNavProps) {
  const pathname = usePathname();

  return (
    <>
      <header className="border-border/80 bg-background/88 sticky top-0 z-30 border-b backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <AddTaskLauncher
              projects={projects}
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

      <nav
        className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-border bg-card/95 p-1 shadow-[var(--shadow-lift)] backdrop-blur lg:hidden"
        aria-label="Bottom navigation"
      >
        <ul className="grid grid-cols-6 gap-1">
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
    </>
  );
}
