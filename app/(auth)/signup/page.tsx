import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-dvh bg-[var(--gradient-surface)] text-foreground">
      <header className="border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="animate-fadeInUp space-y-4">
          <p className="text-overline">Start fresh</p>
          <h1 className="text-page-title">Build a calmer focus system.</h1>
          <p className="max-w-lg text-sm text-muted-foreground">Create your workspace and start with a clean task + focus loop that stays reliable across devices. <span className="font-semibold text-emerald-700">100% free.</span></p>
          <div className="rounded-xl border border-emerald-200/50 bg-card/70 p-4 text-sm text-muted-foreground shadow-sm">
            Your timezone and defaults can be updated any time in Settings.
          </div>
        </div>

        <div className="animate-fadeInUp stagger-2 space-y-3">
          <SignupForm />
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
