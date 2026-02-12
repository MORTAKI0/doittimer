import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";

const features = [
  {
    title: "Reliable Pomodoro",
    desc: "Timer state stays accurate across refreshes and inactive tabs.",
  },
  {
    title: "Tasks + Focus",
    desc: "Link sessions to tasks so your output and time stay connected.",
  },
  {
    title: "Calm stats",
    desc: "Get daily clarity without noisy dashboards or clutter.",
  },
];

const steps = [
  { n: "01", title: "Capture tasks", desc: "Write down what must get done today." },
  { n: "02", title: "Run focus sessions", desc: "Work in clean cycles with clear starts and stops." },
  { n: "03", title: "Review progress", desc: "Use simple totals to improve each day." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[var(--gradient-surface)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonStyles({ size: "sm" })}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24 overflow-hidden">
        {/* Hero background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/[0.07] via-teal-500/[0.04] to-transparent blur-3xl" />
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fadeInUp space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Free &middot; No credit card required
            </div>
            <h1 className="text-page-title text-foreground leading-tight">
              Pomodoro, tasks, and focus
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                in one place.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">DoItTimer gives you a reliable focus loop with clean task management and practical daily insights.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonStyles({ size: "lg" })}>Create free account</Link>
              <Link href="/login" className={`${buttonStyles({ variant: "secondary", size: "lg" })} border border-border/80`}>I already have an account</Link>
            </div>
          </div>

          <Card className="space-y-6 p-7" variant="interactive">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Current focus</p>
                <p className="text-xs text-muted-foreground">Task: Product review prep</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">Running</span>
            </div>

            <div className="animate-floatSoft flex justify-center">
              <div className="card-hover-lift w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <ProgressRing value={0.33} size={200}>
                  <p className="numeric-tabular text-center text-4xl font-semibold tracking-tight text-foreground">00:25:00</p>
                </ProgressRing>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>8 min elapsed</span>
              <span>17 min remaining</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <p className="text-overline">Features</p>
          <h2 className="text-section-title text-foreground">Everything you need to stay focused</h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="animate-fadeInUp stagger-1 card-hover-lift rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
              <span className="text-xl" aria-hidden="true">🎯</span>
            </div>
            <h3 className="text-card-title text-foreground">Focus sessions</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start a timer, link a task, and track every minute. See your
              daily stats at a glance.
            </p>
          </div>
          <div className="animate-fadeInUp stagger-2 card-hover-lift rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
              <span className="text-xl" aria-hidden="true">✅</span>
            </div>
            <h3 className="text-card-title text-foreground">Task management</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create, schedule, and queue tasks. Filter by project, status,
              or due date.
            </p>
          </div>
          <div className="animate-fadeInUp stagger-3 card-hover-lift rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
              <span className="text-xl" aria-hidden="true">📊</span>
            </div>
            <h3 className="text-card-title text-foreground">Dashboard insights</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Track trends in focus minutes, completion rate, and on-time
              delivery across any range.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <p className="text-overline">How it works</p>
          <h2 className="text-section-title text-foreground">Three steps to flow state</h2>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            { step: "1", title: "Add your tasks", desc: "Create tasks, assign projects, and set due dates." },
            { step: "2", title: "Start a session", desc: "Hit Space or tap Start, link a task, and enter flow." },
            { step: "3", title: "Track progress", desc: "Review your dashboard, see trends, adjust your plan." },
          ].map((item, i) => (
            <div key={item.step} className={`animate-fadeInUp stagger-${i + 1} flex flex-col items-center gap-3 text-center`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md">
                {item.step}
              </span>
              <h3 className="text-card-title text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="animate-scaleIn rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-12 text-center">
          <h2 className="text-section-title text-foreground">
            Ready to build better habits?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Join for free. No credit card, no ads, no limitations.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonStyles({ size: "lg" })}>Create free account</Link>
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "lg" })}>Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
