"use client";

import * as React from "react";

import { IconMoon, IconSun } from "@/components/ui/icons";
import { setThemeAction } from "@/app/actions/theme";

type ThemeMode = "light" | "dark";

type ThemeToggleProps = {
  initialTheme: ThemeMode;
};

export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<ThemeMode>(initialTheme);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      disabled={isPending}
      onClick={() => {
        setTheme(nextTheme);
        startTransition(() => {
          void setThemeAction(nextTheme);
        });
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {theme === "dark" ? (
        <IconSun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <IconMoon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
