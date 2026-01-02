import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Login
          </Link>
        </div>
      </header>

      <section className="bg-zinc-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12">
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
          <p className="text-sm text-zinc-500">
            Deja un compte ?{" "}
            <Link href="/login" className="font-medium text-zinc-900 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
