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
      <header className="border-b border-zinc-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex min-w-0 items-center gap-4 text-sm">
            <NavLinks />
            {user.email ? (
              <span className="hidden text-xs text-zinc-400 sm:inline">{user.email}</span>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
