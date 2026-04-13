import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ChartSpline,
  CircleHelp,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";

const valueProps = [
  {
    icon: CircleHelp,
    title: "Emotional Context",
    description: "Log mood, stress, and energy levels to build a psychological profile of your day.",
  },
  {
    icon: Sparkles,
    title: "Pattern Engine",
    description: "Our correlation layer identifies behavioral triggers without requiring clinical expertise.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description: "Your relationship with food is personal. We use JWT sessions and full data erasure.",
  },
];

const processSteps = [
  {
    step: "01",
    label: "Log",
    title: "Capture your state",
    description: "Quickly log meals and moods throughout the day. No complex weighing or scanning required.",
  },
  {
    step: "02",
    label: "Analyze",
    title: "Find correlations",
    description: "Our engine groups your data to find statistically grounded links between stress and food.",
  },
  {
    step: "03",
    label: "Insight",
    title: "Act on data",
    description: "Receive human-readable insights and practical suggestions to break the cycle.",
  },
];

const capabilityBlocks = [
  {
    icon: ChartSpline,
    title: "Pattern Recognition",
    description: "Discover how your stress levels directly impact your snack choices.",
  },
  {
    icon: Brain,
    title: "Mood Trends",
    description: "Visualize your emotional journey alongside eating frequency over 30 days.",
  },
  {
    icon: Utensils,
    title: "Hunger Tracking",
    description: "Understand the difference between physical hunger and emotional cravings.",
  },
  {
    icon: ShieldCheck,
    title: "Sleep & Energy",
    description: "See how fatigue influences your tendency to skip meals or choose junk food.",
  },
];

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
              <Brain className="h-4 w-4" />
          </span>
            MindfulMorsel
        </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#methodology" className="transition hover:text-foreground">Methodology</a>
            <a href="#science" className="transition hover:text-foreground">Science</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
            <Link href="/login" className="font-medium text-foreground">Sign In</Link>
          </nav>

          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1fr_0.95fr] md:px-6">
          <div>
            <p className="mb-4 inline-flex rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Final Year Project - CS 2025
            </p>
            <h1 className="font-heading text-4xl leading-tight sm:text-5xl md:text-6xl">
              Track why you eat,
              <br />
              not just what.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              MindfulMorsel uses statistical correlation to uncover hidden links between your emotional states and eating habits.
              No calories, just context.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Start Free Tracking
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#methodology"
                className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold transition hover:bg-muted"
              >
                View Methodology
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border bg-[linear-gradient(120deg,_hsl(var(--muted))_0%,_hsl(var(--background))_100%)] p-5 sm:p-6">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold text-primary">Daily Insight</p>
              <p className="mt-2 text-xl font-semibold leading-snug">
                You tend to reach for "Sugary" snacks on days when your stress level is above 4/5.
              </p>
              <p className="mt-5 border-t pt-3 text-sm text-muted-foreground">
                Suggestion: Try a 5-minute breathing exercise when workload is "High".
              </p>
            </div>
          </div>
        </section>

        <section className="bg-foreground text-background">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-12 text-center sm:grid-cols-4 md:px-6">
            <div>
              <p className="font-heading text-4xl">94%</p>
              <p className="text-xs uppercase tracking-[0.14em] text-background/70">Pattern Accuracy</p>
            </div>
            <div>
              <p className="font-heading text-4xl">7 Days</p>
              <p className="text-xs uppercase tracking-[0.14em] text-background/70">To First Insight</p>
            </div>
            <div>
              <p className="font-heading text-4xl">0</p>
              <p className="text-xs uppercase tracking-[0.14em] text-background/70">Calorie Fields</p>
            </div>
            <div>
              <p className="font-heading text-4xl">100%</p>
              <p className="text-xs uppercase tracking-[0.14em] text-background/70">Private & Secure</p>
            </div>
          </div>
        </section>

        <section id="methodology" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">The Gap in Nutrition Tech</p>
          <h2 className="mt-2 max-w-2xl font-heading text-4xl leading-tight">
            Calorie counting tells you what.
            <br />
            MindfulMorsel tells you why.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {valueProps.map(({ icon: Icon, title, description }) => (
              <article key={title} className="p-5">
                <span className="inline-flex rounded-lg border bg-muted p-2">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="science" className="bg-muted/55">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">The Process</p>
                <h2 className="mt-2 font-heading text-4xl">Three steps to awareness</h2>
              </div>
              <a
                href="#pricing"
                className="inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
              >
                See the Science
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {processSteps.map((item) => (
                <article key={item.step} className="rounded-2xl border bg-background p-6">
                  <div className="mb-4 inline-flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                      {item.step}
                    </span>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                  </div>
                  <h3 className="font-heading text-2xl">{item.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <h2 className="text-center font-heading text-4xl">Built for self-awareness</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {capabilityBlocks.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex rounded-lg border bg-muted p-2">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14 md:px-6">
          <div className="rounded-3xl border bg-foreground px-6 py-10 text-background md:px-10">
            <p className="text-xs uppercase tracking-[0.18em] text-background/70">Ready to start</p>
            <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-heading text-3xl leading-tight md:text-4xl">See your patterns clearly in 7 days.</h2>
                <p className="mt-2 max-w-2xl text-sm text-background/75 md:text-base">
                  Start logging mood and meals today to generate your first statistically grounded insight this week.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center rounded-lg bg-background px-5 text-sm font-semibold text-foreground transition hover:opacity-90"
                >
                  Start Tracking
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-lg border border-background/30 px-5 text-sm font-semibold text-background transition hover:bg-background/10"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/35">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="rounded-md bg-foreground p-1.5 text-background">
                <Brain className="h-4 w-4" />
              </span>
              MindfulMorsel
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Behavioural mood and eating pattern tracking designed for practical self-awareness.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
            <div>
              <p className="mb-2 font-semibold">Product</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#methodology" className="hover:text-foreground">Methodology</a></li>
                <li><a href="#science" className="hover:text-foreground">Science</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Capabilities</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold">Account</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-foreground">Create Account</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold">Legal</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span>Privacy Policy</span></li>
                <li><span>Terms of Service</span></li>
                <li><span>Data Deletion</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 text-xs text-muted-foreground md:px-6">
            <span>© 2026 MindfulMorsel Project</span>
            <span>Built for behavioural insight, not calorie counting.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
