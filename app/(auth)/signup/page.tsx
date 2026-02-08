import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Sign in
          </Link>
        </div>
      </header>

      <section className="bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12">
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
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
