import Link from "next/link";

import { Brand } from "@/components/layout/Brand";
import { buttonStyles } from "@/components/ui/button";

/* ===== DATA ===== */

const features = [
  {
    title: "Reliable Pomodoro",
    desc: "A timer built to stay accurate even after refreshes or inactive tabs.",
    icon: "⏱️",
  },
  {
    title: "Tasks + Focus",
    desc: "Connect sessions to tasks so you always know where your time went.",
    icon: "✅",
  },
  {
    title: "Simple Stats",
    desc: "Daily totals that keep you improving without data overload.",
    icon: "📊",
  },
];

const steps = [
  { n: "01", title: "Create a task", desc: "Define the one thing you want to finish today." },
  { n: "02", title: "Start a focus", desc: "Work in cycles with clear start and stop times." },
  { n: "03", title: "Review totals", desc: "Improve your rhythm with simple daily stats." },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Designer",
    avatar: "SC",
    quote: "DoItTimer transformed how I work. The simplicity is refreshing - no feature overload, just pure focus.",
  },
  {
    name: "Marcus Johnson",
    role: "Software Engineer",
    avatar: "MJ",
    quote: "Finally, a Pomodoro app that actually remembers my session even when I accidentally close the tab!",
  },
  {
    name: "Emily Roberts",
    role: "Freelance Writer",
    avatar: "ER",
    quote: "The task integration is genius. I can see exactly where my hours go each day.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: ["Unlimited focus sessions", "Basic task management", "Daily stats", "Browser notifications"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "per month",
    description: "For serious productivity",
    features: [
      "Everything in Free",
      "Advanced analytics",
      "Weekly & monthly reports",
      "Custom focus durations",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Team",
    price: "$12",
    period: "per user/month",
    description: "For productive teams",
    features: [
      "Everything in Pro",
      "Team dashboards",
      "Shared projects",
      "Admin controls",
      "API access",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    question: "What happens if I close my browser during a session?",
    answer:
      "No worries! DoItTimer saves your session progress automatically. When you return, your timer will pick up right where you left off.",
  },
  {
    question: "Can I use DoItTimer offline?",
    answer:
      "Yes! We have a service worker that enables offline mode. Your sessions and tasks sync when you're back online.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use Supabase with row-level security, meaning only you can access your data. All connections are encrypted with SSL.",
  },
  {
    question: "Can I cancel my Pro subscription anytime?",
    answer:
      "Yes, you can cancel anytime with no questions asked. Your Pro features will remain active until the end of your billing period.",
  },
];

/* ===== COMPONENTS ===== */

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 hover:border-emerald-200">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-2xl mb-4 shadow-sm">
          {icon}
        </div>
        <div className="text-lg font-semibold text-zinc-900">{title}</div>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 hover:border-emerald-200">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25">
          {n}
        </div>
        <div className="text-lg font-semibold text-zinc-900">{title}</div>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  avatar,
  quote,
}: {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 hover:border-emerald-200">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        {/* Quote mark */}
        <div className="text-5xl font-serif text-emerald-200 leading-none mb-2">&ldquo;</div>
        <p className="text-zinc-700 text-sm leading-relaxed mb-6">{quote}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
            {avatar}
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">{name}</div>
            <div className="text-xs text-zinc-500">{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  popular,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${popular
          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-105 z-10"
          : "bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200"
        }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Most Popular
          </span>
        </div>
      )}
      <div className={`text-lg font-bold ${popular ? "text-white" : "text-zinc-900"}`}>{name}</div>
      <p className={`text-sm mt-1 ${popular ? "text-emerald-100" : "text-zinc-500"}`}>{description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`text-4xl font-bold ${popular ? "text-white" : "text-zinc-900"}`}>{price}</span>
        <span className={`text-sm ${popular ? "text-emerald-100" : "text-zinc-500"}`}>/ {period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className={`flex items-center gap-2 text-sm ${popular ? "text-emerald-50" : "text-zinc-600"}`}>
            <svg className={`w-4 h-4 ${popular ? "text-emerald-200" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-6 block text-center rounded-lg py-3 px-4 font-semibold transition-all duration-300 ${popular
            ? "bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg"
            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg"
          }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-zinc-100 py-5 last:border-b-0">
      <div className="text-base font-semibold text-zinc-900 mb-2">{question}</div>
      <p className="text-sm text-zinc-600 leading-relaxed">{answer}</p>
    </div>
  );
}

/* ===== MAIN PAGE ===== */

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900 overflow-x-hidden">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/signup" className={`${buttonStyles({ variant: "primary", size: "sm" })} shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-shadow`}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white to-white">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                <span className="mr-2">🎯</span> Pomodoro • Tasks • Stats
              </p>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-zinc-900 md:text-6xl lg:text-7xl leading-[1.1]">
                Focus deeply
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">without the clutter.</span>
              </h1>
              <p className="mt-6 text-lg text-zinc-600 md:text-xl max-w-lg leading-relaxed">
                DoItTimer combines a reliable Pomodoro timer, simple tasks, and daily stats to keep you in rhythm.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/signup" className={`${buttonStyles({ size: "lg" })} shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5`}>
                  Create free account
                </Link>
                <Link href="/login" className={`${buttonStyles({ variant: "secondary", size: "lg" })} hover:-translate-y-0.5 transition-all`}>
                  I already have an account
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Free forever plan
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  No credit card required
                </span>
              </div>
            </div>

            {/* Timer Mockup Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl p-8 shadow-2xl shadow-zinc-900/10 border border-zinc-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Focus Session</div>
                    <div className="text-xs text-zinc-500 mt-1">Active task: Design review</div>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                    Running
                  </div>
                </div>

                {/* Timer Display */}
                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center shadow-inner border border-emerald-100">
                      <div className="text-5xl font-bold text-zinc-900 tracking-tight">25:00</div>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-8">
                  <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-2.5 w-1/3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>8 min elapsed</span>
                    <span>17 min remaining</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Pomodoros", value: "4" },
                    { label: "Focused", value: "1h 40m" },
                    { label: "Tasks", value: "3/5" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-3 text-center border border-zinc-100">
                      <div className="text-xs text-zinc-500">{stat.label}</div>
                      <div className="mt-1 text-lg font-bold text-zinc-900">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-20 bg-gradient-to-b from-white to-zinc-50/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">Why DoItTimer</h2>
            <p className="mt-4 text-zinc-600">
              Built for people who value simplicity and reliability over feature overload.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">How it works</h2>
            <p className="mt-4 text-zinc-600">Three simple steps to transform your productivity.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <StepCard key={step.n} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">Loved by productive people</h2>
            <p className="mt-4 text-zinc-600">See what our users are saying about DoItTimer.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-zinc-600">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto items-start">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">Frequently asked questions</h2>
            <p className="mt-4 text-zinc-600">Everything you need to know about DoItTimer.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-100">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 bg-gradient-to-br from-emerald-500 to-emerald-600 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-400/30 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Ready to focus like never before?
          </h2>
          <p className="mt-4 text-lg text-emerald-100">
            Join thousands of productive people using DoItTimer to get more done.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-600 font-semibold h-12 px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
              Get started for free
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <Brand />
              <p className="mt-3 text-sm text-zinc-500 max-w-xs">
                The simple Pomodoro timer for people who want to focus.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div>
                <div className="font-semibold text-zinc-900 mb-3">Product</div>
                <div className="flex flex-col gap-2 text-zinc-500">
                  <Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
                  <Link href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</Link>
                </div>
              </div>
              <div>
                <div className="font-semibold text-zinc-900 mb-3">Account</div>
                <div className="flex flex-col gap-2 text-zinc-500">
                  <Link href="/login" className="hover:text-emerald-600 transition-colors">Sign in</Link>
                  <Link href="/signup" className="hover:text-emerald-600 transition-colors">Create account</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-zinc-500">
            <div>© {new Date().getFullYear()} DoItTimer. All rights reserved.</div>
            <div className="flex gap-6">
              <span className="hover:text-zinc-900 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-zinc-900 cursor-pointer transition-colors">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
