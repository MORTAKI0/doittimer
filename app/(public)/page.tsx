import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    title: "Pomodoro fiable",
    desc: "Un timer concu pour rester precis meme apres un refresh ou un onglet inactif.",
  },
  {
    title: "Taches + focus",
    desc: "Relie tes sessions a tes taches pour savoir ou part ton temps.",
  },
  {
    title: "Stats simples",
    desc: "Suivi quotidien pour ameliorer ton rythme sans te noyer dans les dashboards.",
  },
];

const steps = [
  { n: "01", title: "Cree une tache", desc: "Definis ce que tu veux accomplir aujourd'hui." },
  { n: "02", title: "Lance un focus", desc: "Travaille en cycles, pauses incluses." },
  { n: "03", title: "Observe tes stats", desc: "Ameliore ton rythme avec des donnees simples." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Se connecter
            </Link>
            <Link href="/signup" className={buttonStyles({ variant: "primary", size: "sm" })}>
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600">
              Pomodoro - taches - stats
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Travaille mieux, sans te compliquer la vie.
            </h1>
            <p className="mt-4 text-base text-zinc-600 md:text-lg">
              DoItTimer combine un timer Pomodoro fiable, des taches et des statistiques simples
              pour t&apos;aider a garder le rythme.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonStyles({ size: "lg" })}>
                Creer un compte
              </Link>
              <Link
                href="/login"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                J&apos;ai deja un compte
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Sprint 0: Home + Auth (Supabase). Timer & taches arrivent ensuite.
            </p>
          </div>

          <Card className="p-6 hover:shadow-none">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">Focus</div>
                <div className="text-xs text-zinc-500">Tache active: -</div>
              </div>
              <div className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                25:00
              </div>
            </div>
            <div className="mt-6 h-2 w-full rounded-full bg-zinc-100">
              <div className="h-2 w-1/3 rounded-full bg-zinc-900" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Pomodoros</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">0</div>
              </Card>
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Work</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">0m</div>
              </Card>
              <Card className="p-3 hover:shadow-none">
                <div className="text-zinc-500">Taches</div>
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
        <h2 className="text-xl font-semibold text-zinc-900">Pourquoi DoItTimer</h2>
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
          <h2 className="text-xl font-semibold text-zinc-900">Comment ca marche</h2>
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
