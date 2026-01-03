import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    title: "Reliable Pomodoro",
    desc: "A timer built to stay accurate even after refreshes or inactive tabs.",
  },
  {
    title: "Tasks + focus",
    desc: "Connect sessions to tasks so you always know where your time went.",
  },
  {
    title: "Simple stats",
    desc: "Daily totals that keep you improving without data overload.",
  },
];

const steps = [
  { n: "01", title: "Create a task", desc: "Define the one thing you want to finish today." },
  { n: "02", title: "Start a focus", desc: "Work in cycles with clear start and stop times." },
  { n: "03", title: "Review totals", desc: "Improve your rhythm with simple daily stats." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonStyles({ variant: "primary", size: "sm" })}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Pomodoro - tasks - stats
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Focus deeply without the clutter.
            </h1>
            <p className="mt-4 text-base text-zinc-600 md:text-lg">
              DoItTimer combines a reliable Pomodoro timer, simple tasks, and daily stats to keep
              you in rhythm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonStyles({ size: "lg" })}>
                Create account
              </Link>
              <Link
                href="/login"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Sprint 1: Tasks, focus sessions, and stats are ready.
            </p>
          </div>

          <Card className="p-6 hover:shadow-none">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">Focus</div>
                <div className="text-xs text-zinc-500">Active task: -</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                25:00
              </div>
            </div>
            <div className="mt-6 h-2 w-full rounded-full bg-zinc-100">
              <div className="h-2 w-1/3 rounded-full bg-emerald-600" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Pomodoros</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">0</div>
              </Card>
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Focused</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">0m</div>
              </Card>
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Tasks</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">0</div>
              </Card>
            </div>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <Separator />
      </div>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xl font-semibold text-zinc-900">Why DoItTimer</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <div className="text-sm font-semibold text-zinc-900">{feature.title}</div>
              <p className="mt-2 text-sm text-zinc-600">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xl font-semibold text-zinc-900">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.n}>
                <div className="text-xs font-semibold text-zinc-500">{step.n}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{step.title}</div>
                <p className="mt-2 text-sm text-zinc-600">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>(c) {new Date().getFullYear()} DoItTimer</div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-zinc-900">
              Login
            </Link>
            <Link href="/signup" className="hover:text-zinc-900">
              Signup
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
