"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  CommandPalette,
  type CommandAction,
} from "@/components/ui/command-palette";
import {
  IconDashboard,
  IconFocus,
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

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

type AppShellNavProps = {
  children: React.ReactNode;
  initialTheme: "light" | "dark";
  userEmail: string | null;
  queueCount: number;
  hasActiveFocus: boolean;
  activeSession: { id: string; started_at: string } | null;
};

export function AppShellNav({
  children,
  initialTheme,
  userEmail,
  queueCount,
  hasActiveFocus,
  activeSession,
}: AppShellNavProps) {
  const pathname = usePathname();

  const commandActions: CommandAction[] = [
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      href: "/dashboard",
      hint: "Navigation",
    },
    {
      id: "nav-tasks",
      label: "Go to Tasks",
      href: "/tasks",
      hint: "Navigation",
    },
    {
      id: "nav-focus",
      label: "Go to Focus",
      href: "/focus",
      hint: "Navigation",
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      href: "/settings",
      hint: "Navigation",
    },
    {
      id: "quick-create-task",
      label: "Create task",
      href: "/tasks?compose=1",
      hint: "Quick action",
    },
    {
      id: "quick-start-focus",
      label: "Start focus",
      href: "/focus",
      hint: "Quick action",
    },
    {
      id: "quick-scheduled",
      label: "Scheduled today",
      href: "/tasks?range=day",
      hint: "Quick action",
    },
  ];

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <CommandPalette actions={commandActions} />
      <GlobalRunningSessionWidget activeSession={activeSession} />
      <div className="mx-auto grid min-h-dvh max-w-[1200px] grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="border-border/80 bg-muted/20 hidden border-r lg:block">
          <div className="sticky top-0 flex h-dvh flex-col px-4 py-6">
            <Brand />
            <nav className="mt-8 space-y-1" aria-label="Main navigation">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-150",
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "text-muted-foreground hover:border-border hover:bg-card hover:text-foreground border-transparent",
                    ].join(" ")}
                  >
                    <link.Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{link.label}</span>
                    {link.href === "/tasks" && queueCount > 0 ? (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                        {Math.min(queueCount, 99)}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-3">
              {hasActiveFocus ? (
                <Link
                  href="/focus"
                  className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                >
                  <div className="font-semibold">Focus now running</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span>Session</span>
                    <span className="numeric-tabular">Live timer active</span>
                  </div>
                </Link>
              ) : null}
              <div className="border-border bg-card flex items-center justify-between rounded-xl border px-3 py-2">
                <p className="text-muted-foreground truncate text-xs">
                  {userEmail ?? "Signed in"}
                </p>
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
                {hasActiveFocus ? (
                  <Link
                    href="/focus"
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Running
                  </Link>
                ) : null}
                <ThemeToggle initialTheme={initialTheme} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>

          <nav
            className="border-border bg-card/95 fixed inset-x-3 bottom-3 z-40 rounded-2xl border p-1 shadow-[var(--shadow-lift)] backdrop-blur lg:hidden"
            aria-label="Bottom navigation"
          >
            <ul className="grid grid-cols-4 gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                        isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      <link.Icon className="h-4 w-4" aria-hidden="true" />
                      {link.label}
                      {link.href === "/tasks" && queueCount > 0 ? (
                        <Badge
                          className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px]"
                          variant="accent"
                        >
                          {Math.min(queueCount, 9)}
                        </Badge>
                      ) : null}
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
