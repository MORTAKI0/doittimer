"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  run?: () => void;
};

type CommandPaletteProps = {
  actions: CommandAction[];
};

export function CommandPalette({ actions }: CommandPaletteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isMetaK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = actions.filter((action) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return action.label.toLowerCase().includes(q) || action.hint?.toLowerCase().includes(q);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[12dvh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
        aria-label="Close command palette"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]">
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions..."
            aria-label="Search commands"
          />
        </div>
        <ul className="max-h-[55dvh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
          ) : (
            filtered.map((action) => {
              const isActive = Boolean(action.href && (pathname === action.href || pathname.startsWith(`${action.href}/`)));
              const className = [
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                isActive ? "bg-emerald-50 text-emerald-900" : "",
              ].join(" ");

              if (action.href) {
                return (
                  <li key={action.id}>
                    <Link href={action.href} className={className} onClick={() => setOpen(false)}>
                      <span>{action.label}</span>
                      {action.hint ? <span className="text-xs text-muted-foreground">{action.hint}</span> : null}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={action.id}>
                  <button
                    type="button"
                    className={className}
                    onClick={() => {
                      action.run?.();
                      setOpen(false);
                      router.refresh();
                    }}
                  >
                    <span>{action.label}</span>
                    {action.hint ? <span className="text-xs text-muted-foreground">{action.hint}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
