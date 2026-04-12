import Link from "next/link";
import { ArrowRight, Brain, ChartSpline, ShieldCheck, Utensils } from "lucide-react";

const highlights = [
  {
    icon: Brain,
    title: "Track emotional patterns",
    description: "Capture mood, stress, and energy in under 20 seconds and spot shifts over time.",
  },
  {
    icon: Utensils,
    title: "Log meals consistently",
    description: "Record meals, hunger levels, and food categories to uncover behavior loops.",
  },
  {
    icon: ChartSpline,
    title: "View actionable insights",
    description: "Turn your logs into weekly patterns and practical recommendations.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-first by design",
    description: "Your account data is protected by secure auth and backend policy controls.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,_hsl(var(--primary)/0.18),_transparent_40%),radial-gradient(circle_at_100%_10%,_hsl(30_95%_55%/0.22),_transparent_32%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted))_100%)]">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:36px_36px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-xl bg-primary p-2 text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <p className="font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">MoodTracker</p>
            <p className="text-sm font-semibold">Behavioural Health Journal</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-foreground transition hover:bg-background/70"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 md:px-6">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:py-18">
          <div>
            <p className="mb-4 inline-flex rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Daily mental + nutrition intelligence
            </p>
            <h1 className="font-heading text-4xl leading-tight sm:text-5xl md:text-6xl">
              Understand how your mood and meals influence each other.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              A clean, evidence-driven workspace to track behavior, discover triggers, and build healthier routines week by week.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
              >
                Start tracking
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg border bg-background/85 px-4 py-2.5 text-sm font-semibold transition hover:bg-background"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border bg-background/80 p-5 shadow-xl backdrop-blur sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border bg-card p-4">
                  <span className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
