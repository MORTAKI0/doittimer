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

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Pomodoro, tasks, and focus in one place
          </p>
          <h1 className="mt-5 text-page-title text-foreground">Focus deeply without noisy productivity tooling.</h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">DoItTimer gives you a reliable focus loop with clean task management and practical daily insights.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonStyles({ size: "lg" })}>Create free account</Link>
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "lg" })}>I already have an account</Link>
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
          <div className="flex items-center justify-center">
            <ProgressRing value={0.33} size={200}>
              <p className="numeric-tabular text-center text-4xl font-semibold tracking-tight text-foreground">00:25:00</p>
            </ProgressRing>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>8 min elapsed</span>
            <span>17 min remaining</span>
          </div>
        </Card>
      </section>

      <section className="border-y border-border/80 bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} variant="interactive" className="space-y-2">
              <h2 className="text-card-title text-foreground">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-section-title text-foreground">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">Three simple steps to run your day with intention.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.n} className="space-y-2">
              <p className="numeric-tabular text-xs font-semibold text-emerald-700">{step.n}</p>
              <h3 className="text-card-title text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border/80 bg-emerald-600">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Ready to focus better?</h2>
          <p className="mt-3 text-sm text-emerald-100">Start with a free account and build a steady focus rhythm.</p>
          <div className="mt-6">
            <Link href="/signup" className="inline-flex h-11 items-center justify-center rounded-xl border border-white bg-white px-5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50">
              Get started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
