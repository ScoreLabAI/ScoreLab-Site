import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Loader2, TrendingUp, Flame, Target, Clock, Activity, BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getProgressData } from "@/lib/progress.functions";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progress — ScoreLab AI" }] }),
});

interface ProgressData {
  streak: number;
  totals: { answered: number; correct: number; avgTimeSeconds: number };
  latestScore: { projected_total: number; projected_math: number; projected_reading_writing: number; created_at: string; trajectory_status: string } | null;
  projections: Array<{ projected_total: number; created_at: string }>;
  sessions: Array<{ id: string; session_type: string; status: string; started_at: string | null; completed_at: string | null; total_questions: number | null; correct_count: number | null; estimated_score: number | null }>;
  skills: Array<{ category: string; subcategory: string | null; correct: number; total: number; accuracy: number; lastUpdated: string }>;
  activity: Array<{ date: string; answered: number; correct: number }>;
}

function ProgressPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fetchFn = useServerFn(getProgressData);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchFn()
      .then(d => { if (!cancelled) setData(d as ProgressData); })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load progress"); });
    return () => { cancelled = true; };
  }, [user, fetchFn]);

  if (loading || (!data && !err)) {
    return (
      <div className="min-h-screen bg-secondary/30"><AppNav />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="min-h-screen bg-secondary/30"><AppNav />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{err ?? "No data"}</p>
            <Button asChild variant="outline" className="mt-6"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Link></Button>
          </Card>
        </main>
      </div>
    );
  }

  const accuracy = data.totals.answered ? Math.round((data.totals.correct / data.totals.answered) * 100) : 0;
  const maxActivity = Math.max(1, ...data.activity.map(a => a.answered));
  const sortedSkills = [...data.skills].sort((a, b) => a.accuracy - b.accuracy);

  // tiny inline chart for projection trend
  const projPoints = data.projections.slice(-10);
  const minS = Math.min(400, ...projPoints.map(p => p.projected_total));
  const maxS = Math.max(1600, ...projPoints.map(p => p.projected_total));
  const range = Math.max(1, maxS - minS);

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
            <p className="text-sm text-muted-foreground">Track score trajectory, accuracy, and skill mastery.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Link></Button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock icon={TrendingUp} label="Current Projection" value={data.latestScore ? `${data.latestScore.projected_total}` : "—"} sub={data.latestScore ? "of 1600" : "Take diagnostic"} />
          <StatBlock icon={Target} label="Overall Accuracy" value={`${accuracy}%`} sub={`${data.totals.correct}/${data.totals.answered}`} />
          <StatBlock icon={Flame} label="Streak" value={`${data.streak}`} sub={`day${data.streak === 1 ? "" : "s"}`} />
          <StatBlock icon={Clock} label="Avg Time/Q" value={`${data.totals.avgTimeSeconds}s`} sub="per question" />
        </div>

        {/* Score trajectory */}
        {projPoints.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Score trajectory
            </div>
            <div className="mt-5 flex items-end gap-1 h-32">
              {projPoints.map((p, i) => {
                const h = ((p.projected_total - minS) / range) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] text-muted-foreground">{p.projected_total}</div>
                    <div className="w-full bg-accent rounded-t" style={{ height: `${Math.max(4, h)}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{new Date(projPoints[0].created_at).toLocaleDateString()}</span>
              <span>{new Date(projPoints[projPoints.length - 1].created_at).toLocaleDateString()}</span>
            </div>
          </Card>
        )}

        {/* 14-day activity */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-4 w-4" /> Last 14 days
          </div>
          <div className="mt-5 grid grid-cols-14 gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
            {data.activity.map((a, i) => {
              const intensity = a.answered / maxActivity;
              const opacity = a.answered === 0 ? 0.08 : 0.3 + intensity * 0.7;
              return (
                <div key={i} className="aspect-square rounded" title={`${a.date}: ${a.answered} answered, ${a.correct} correct`} style={{ backgroundColor: `hsl(var(--accent) / ${opacity})` }} />
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>{data.activity[0]?.date}</span>
            <span>Today</span>
          </div>
        </Card>

        {/* Skills */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-4 w-4" /> Skill mastery
          </div>
          {sortedSkills.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">Complete practice or a diagnostic to start building your skill map.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {sortedSkills.map((s, i) => {
                const pct = Math.round(s.accuracy * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.category}{s.subcategory ? ` · ${s.subcategory}` : ""}</span>
                      <span className="text-muted-foreground">{s.correct}/{s.total} · {pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1 h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent sessions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4" /> Recent sessions
          </div>
          {data.sessions.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <div className="mt-5 space-y-2">
              {data.sessions.slice(0, 10).map(s => {
                const date = s.completed_at || s.started_at;
                const acc = s.total_questions ? Math.round(((s.correct_count ?? 0) / s.total_questions) * 100) : null;
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">{s.session_type}</Badge>
                      <span className="text-muted-foreground">{date ? new Date(date).toLocaleString() : "—"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {s.estimated_score && <span className="font-semibold">{s.estimated_score}</span>}
                      {acc !== null && <span className="text-muted-foreground">{s.correct_count}/{s.total_questions} · {acc}%</span>}
                      {s.session_type === "diagnostic" && s.status === "completed" && (
                        <Button asChild size="sm" variant="ghost"><Link to="/results/$sessionId" params={{ sessionId: s.id }}>View<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
