import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getTheme } from "@/app/actions/theme";
import { getUser } from "@/lib/auth/get-user";
import { NavLinks } from "./NavLinks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const theme = await getTheme();
  const initialTheme = theme === "dark" ? "dark" : "light";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Brand />
          <div className="flex min-w-0 items-center gap-4 text-sm">
            <NavLinks />
            <ThemeToggle initialTheme={initialTheme} />
            {user.email ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.email}
              </span>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
