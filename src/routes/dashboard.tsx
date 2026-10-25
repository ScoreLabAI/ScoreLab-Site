import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Flame,
  Brain,
  Target,
  Calendar,
  ArrowRight,
  Lock,
  Sparkles,
  Play,
  BarChart3,
} from "lucide-react";
import { getProgressData } from "@/lib/progress.functions";
import { getDueReview } from "@/lib/practice.functions";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — ScoreLab AI" }] }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [sessionsCount, setSessionsCount] = useState(0);
  const [aiMinutes, setAiMinutes] = useState(0);
  const [projection, setProjection] = useState<{
    total: number | null;
    math: number | null;
    rw: number | null;
    status: string | null;
  }>({ total: null, math: null, rw: null, status: null });
  const [streak, setStreak] = useState(0);
  const [topSkills, setTopSkills] = useState<
    Array<{ category: string; subcategory: string | null; accuracy: number; total: number }>
  >([]);
  const [dueReview, setDueReview] = useState<{
    count: number;
    skills: Array<{ category: string; subcategory: string | null }>;
  }>({ count: 0, skills: [] });

  const getProgress = useServerFn(getProgressData);
  const getDue = useServerFn(getDueReview);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile && !profile.onboarding_completed) {
      navigate({ to: "/onboarding" });
      return;
    }

    if (user) {
      supabase
        .from("test_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .then(({ count }) => setSessionsCount(count ?? 0));

      const monthYear = new Date().toISOString().slice(0, 7);
      supabase
        .from("ai_usage_tracking")
        .select("ai_minutes_used")
        .eq("student_id", user.id)
        .eq("month_year", monthYear)
        .maybeSingle()
        .then(({ data }) => setAiMinutes(data?.ai_minutes_used ?? 0));

      supabase
        .from("score_projections")
        .select("projected_total,projected_math,projected_reading_writing,trajectory_status")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data)
            setProjection({
              total: data.projected_total,
              math: data.projected_math,
              rw: data.projected_reading_writing,
              status: data.trajectory_status,
            });
        });

      getProgress()
        .then((d) => {
          setStreak(d.streak);
          setTopSkills(
            [...d.skills]
              .filter((s) => s.total >= 2)
              .sort((a, b) => a.accuracy - b.accuracy)
              .slice(0, 4),
          );
        })
        .catch(() => {});

      getDue()
        .then(setDueReview)
        .catch(() => {});
    }
  }, [loading, user, profile, navigate, getProgress, getDue]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const isStarter = profile.access_type === "starter";
  const isStudent = profile.access_type === "student";
  const aiHoursUsed = aiMinutes / 60;
  const aiCap = 15;
  const hasScore = projection.total !== null;
  const statusLabel =
    projection.status === "on_track"
      ? "On track"
      : projection.status === "ahead"
        ? "Ahead of pace"
        : projection.status === "needs_practice"
          ? "Needs more practice"
          : "Take diagnostic";
  const statusClass =
    projection.status === "ahead" || projection.status === "on_track"
      ? "border-success text-success bg-success/10"
      : "border-warning text-warning-foreground bg-warning/15";

  const weeksToTest = profile.target_test_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.target_test_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7),
        ),
      )
    : null;

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {sessionsCount === 0
              ? "Let's get started with your diagnostic."
              : `${sessionsCount} session${sessionsCount === 1 ? "" : "s"} completed. Keep going.`}
          </p>
        </div>

        {/* Starter upgrade banner */}
        {isStarter && (
          <Card className="p-5 border-accent/30 bg-accent-soft">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-semibold">Unlock practice sessions and the AI tutor</p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Student or Pro to start practicing the skills you missed.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to="/account">See plans</Link>
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score snapshot */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Projected Score
              </h2>
              <Badge variant="outline" className={statusClass}>
                {statusLabel}
              </Badge>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-6xl font-bold tracking-tight text-primary">
                {hasScore ? projection.total : "—"}
              </div>
              <div className="text-sm text-muted-foreground">/ 1600</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Math</div>
                <div className="mt-1 text-2xl font-semibold">
                  {hasScore ? projection.math : "—"}
                </div>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Reading & Writing
                </div>
                <div className="mt-1 text-2xl font-semibold">{hasScore ? projection.rw : "—"}</div>
              </div>
            </div>
            {!hasScore && (
              <p className="mt-4 text-sm text-muted-foreground">
                Take your diagnostic to see your projected score.
              </p>
            )}
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-4 w-4" /> Test Date
              </div>
              <div className="mt-3 text-2xl font-bold">
                {weeksToTest !== null ? `${weeksToTest} weeks` : "Not set"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.target_test_date ?? "Add a date in your account to see countdown."}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Flame className="h-4 w-4" /> Study Streak
              </div>
              <div className="mt-3 text-2xl font-bold">
                {streak} day{streak === 1 ? "" : "s"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {streak > 0
                  ? "Keep it going today."
                  : "Start a session today to begin your streak."}
              </p>
            </Card>
          </div>
        </div>

        {/* AI usage meter (Student tier only) */}
        {isStudent && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Tutor Usage This Month
                </h2>
              </div>
              <div className="text-sm font-medium">
                {aiHoursUsed.toFixed(1)} / {aiCap} hours
              </div>
            </div>
            <Progress value={(aiHoursUsed / aiCap) * 100} className="mt-3 h-2" />
            {aiHoursUsed >= aiCap && (
              <p className="mt-3 text-sm text-warning-foreground">
                You've hit this month's cap. Upgrade to Pro for unlimited AI tutor.
              </p>
            )}
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            icon={Play}
            title="Practice Session"
            desc={
              isStarter
                ? "Upgrade to access practice sessions"
                : "Adaptive questions based on your weak skills"
            }
            cta="Start session"
            to="/practice"
            locked={isStarter}
          />
          <ActionCard
            icon={BarChart3}
            title="Run Diagnostic"
            desc="Re-measure where you stand right now"
            cta="Take diagnostic"
            to="/diagnostic"
            locked={isStarter && sessionsCount > 0}
            lockReason="Starter includes one diagnostic"
          />
          <ActionCard
            icon={TrendingUp}
            title="View Progress"
            desc={
              isStarter
                ? "Detailed analytics with paid plans"
                : "Score over time and skill performance"
            }
            cta="See progress"
            to="/progress"
            locked={isStarter}
          />
        </div>

        {/* Skill performance + Due for review */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-4 w-4" /> Skill Performance
            </div>
            {topSkills.length === 0 ? (
              <div className="mt-6 flex items-center justify-center h-48 rounded-md border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  Complete a session to see your skill map
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {topSkills.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {s.category}
                        {s.subcategory ? ` · ${s.subcategory}` : ""}
                      </span>
                      <span className="text-muted-foreground">{Math.round(s.accuracy * 100)}%</span>
                    </div>
                    <Progress value={s.accuracy * 100} className="mt-1 h-2" />
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link to="/progress">
                    View full skill map
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Brain className="h-4 w-4" /> Due for Review
            </div>
            {dueReview.count === 0 ? (
              <div className="mt-6 flex items-center justify-center h-48 rounded-md border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No reviews due — start practicing to build your queue
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {dueReview.count} skill{dueReview.count === 1 ? "" : "s"} ready to review before
                  you forget them.
                </p>
                <div className="flex flex-wrap gap-2">
                  {dueReview.skills.slice(0, 6).map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {s.category}
                    </Badge>
                  ))}
                </div>
                <Button asChild size="sm" className="w-full mt-2">
                  <Link to="/practice">
                    Review now
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  desc,
  cta,
  to,
  locked,
  lockReason,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  cta: string;
  to: string;
  locked?: boolean;
  lockReason?: string;
}) {
  return (
    <Card
      className={`p-6 transition-all ${locked ? "opacity-75" : "hover:shadow-[var(--shadow-elevated)]"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-5 w-5" />
        </div>
        {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground min-h-[2.5rem]">
        {locked ? (lockReason ?? desc) : desc}
      </p>
      <Button
        variant={locked ? "outline" : "default"}
        className="mt-4 w-full"
        asChild={!locked}
        disabled={locked}
      >
        {locked ? (
          <span>Locked</span>
        ) : (
          <Link to={to}>
            {cta} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        )}
      </Button>
    </Card>
  );
}
