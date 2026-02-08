import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {};
  const signup = Array.isArray(sp.signup) ? sp.signup[0] : sp.signup;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const showSignup = signup === "1";
  const errorMessage = error ? decodeURIComponent(error) : null;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <Link href="/signup" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Sign up
          </Link>
        </div>
      </header>

      <section className="bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12">
          <div className="w-full max-w-md space-y-3">
            {showSignup ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Account created. Check your email if needed, then sign in.
              </p>
            ) : null}
            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
          <p className="text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
