import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/layout/Brand";
import { getUser } from "@/lib/auth/get-user";

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
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
              Settings
            </Link>
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
