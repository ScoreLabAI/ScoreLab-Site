import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Brain,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ScoreLab AI — Adaptive SAT Prep, Powered by AI" },
      {
        name: "description",
        content:
          "ScoreLab AI is the adaptive SAT prep platform that diagnoses your weaknesses, builds a study plan, and gives you an AI tutor that explains every mistake.",
      },
      { property: "og:title", content: "ScoreLab AI — Adaptive SAT Prep, Powered by AI" },
      {
        property: "og:description",
        content:
          "Diagnose weaknesses, practice with spaced repetition, and learn from an AI tutor that explains every mistake.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ScoreLab AI — Adaptive SAT Prep, Powered by AI" },
      {
        name: "twitter:description",
        content: "Adaptive AI-powered SAT prep that meets you exactly where you are.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function LandingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">
                    Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Background grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Soft gradient blob */}
        <div
          className="absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-accent)" }}
        />

        <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Built by Florida's finest SAT tutors
            </div>
            <h1 className="mt-8 text-5xl md:text-7xl font-semibold tracking-[-0.03em] text-foreground leading-[1.02]">
              Score higher.
              <br />
              <span className="text-muted-foreground">Study smarter.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-lg text-muted-foreground leading-relaxed">
              The adaptive SAT prep platform that finds your weaknesses, builds your study plan,
              and gives you an AI tutor that explains every single mistake.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link to="/signup">
                  Start free diagnostic <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-12 px-6 text-base" asChild>
                <a href="#how-it-works">
                  How it works <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Free forever plan · No credit card required
            </p>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
            {[
              { value: "+140", label: "Avg. score gain" },
              { value: "54", label: "Adaptive questions" },
              { value: "24/7", label: "AI tutor access" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-6 text-center">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">
              The platform
            </div>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-[-0.02em]">
              A complete SAT prep system.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to add 100+ points — backed by AI and proven learning science.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              {
                icon: BarChart3,
                title: "Adaptive Diagnostic",
                desc: "A two-stage adaptive test that pinpoints exactly where you stand and what to focus on first.",
              },
              {
                icon: Brain,
                title: "AI Tutor That Explains",
                desc: "Get a clear, patient explanation for every wrong answer — and ask follow-up questions until it clicks.",
              },
              {
                icon: BookOpen,
                title: "Spaced Repetition",
                desc: "Missed questions come back at the perfect interval so concepts actually stick for test day.",
              },
              {
                icon: TrendingUp,
                title: "Score Trajectory",
                desc: "Project your test-day score and track the gap to your dream colleges in real time.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card p-8 md:p-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-secondary/30 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">Process</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-[-0.02em]">
              Three steps. Real results.
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                n: "01",
                title: "Take the diagnostic",
                desc: "A 54-question adaptive test that maps every skill — strength and weakness.",
              },
              {
                n: "02",
                title: "Get your plan",
                desc: "We build a week-by-week study plan based on your test date and weak areas.",
              },
              {
                n: "03",
                title: "Practice with AI",
                desc: "Daily focused sessions plus an AI tutor that explains your mistakes in plain English.",
              },
            ].map((s) => (
              <div key={s.n} className="relative border-t border-border pt-6">
                <div className="text-sm font-mono text-accent">{s.n}</div>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">Pricing</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-[-0.02em]">
              Simple, honest pricing.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you're ready to take it seriously.
            </p>

            <div className="mt-8 inline-flex items-center rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                  !annual ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                  annual ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-success">Save 2 months</span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="Free"
              sub="Forever"
              features={[
                "1 full diagnostic test",
                "Personalized weakness report",
                "Projected score forecast",
              ]}
              cta="Start free"
              ctaTo="/signup"
            />
            <PricingCard
              name="Student"
              price={annual ? "$249" : "$29"}
              sub={annual ? "/year" : "/month"}
              features={[
                "Everything in Starter",
                "Unlimited practice sessions",
                "AI tutor (15 hrs/month)",
                "Spaced repetition queue",
                "Progress analytics",
              ]}
              cta="Get Student"
              ctaTo="/signup"
              featured
            />
            <PricingCard
              name="Pro"
              price={annual ? "$499" : "$59"}
              sub={annual ? "/year" : "/month"}
              features={[
                "Everything in Student",
                "Unlimited AI tutor",
                "Weekly parent reports",
                "Downloadable study plans",
                "Priority support",
              ]}
              cta="Get Pro"
              ctaTo="/signup"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground p-12 md:p-16 text-center">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div
              className="absolute -bottom-32 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
              style={{ background: "var(--gradient-accent)" }}
            />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em]">
                Ready to score higher?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl mx-auto">
                Take your free diagnostic in under an hour. Get your personalized plan
                instantly.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 h-12 px-6 text-base"
                  asChild
                >
                  <Link to="/signup">
                    Start free diagnostic <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© ScoreLab AI · Built by Florida's Finest Tutors</p>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  name,
  price,
  sub,
  features,
  cta,
  ctaTo,
  featured,
}: {
  name: string;
  price: string;
  sub: string;
  features: string[];
  cta: string;
  ctaTo: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-8 flex flex-col ${
        featured
          ? "border-foreground bg-card shadow-[var(--shadow-elevated)]"
          : "border-border bg-card"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
          Most Popular
        </div>
      )}
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {name}
      </h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-5xl font-semibold tracking-[-0.03em]">{price}</span>
        <span className="text-sm text-muted-foreground">{sub}</span>
      </div>
      <div className="my-7 h-px bg-border" />
      <ul className="space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-8 w-full"
        variant={featured ? "default" : "outline"}
        asChild
      >
        <Link to={ctaTo}>{cta}</Link>
      </Button>
    </div>
  );
}
