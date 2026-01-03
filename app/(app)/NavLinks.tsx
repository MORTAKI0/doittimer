"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconDashboard, IconFocus, IconSettings, IconTasks } from "@/components/ui/icons";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/focus", label: "Focus", Icon: IconFocus },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap">
      {NAV_LINKS.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <link.Icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
