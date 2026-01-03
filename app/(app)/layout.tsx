import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/Brand";
import { getUser } from "@/lib/auth/get-user";
import { NavLinks } from "./NavLinks";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Brand />
          <div className="flex min-w-0 items-center gap-4 text-sm">
            <NavLinks />
            {user.email ? (
              <span className="hidden text-xs text-zinc-400 sm:inline">{user.email}</span>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
