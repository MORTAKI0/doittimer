"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/focus", label: "Focus" },
  { href: "/settings", label: "Settings" },
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
              "rounded-md px-2 py-1 text-zinc-600 transition-colors hover:text-zinc-900",
              isActive ? "bg-zinc-100 text-zinc-900" : null,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
