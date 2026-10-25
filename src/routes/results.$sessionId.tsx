import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Sparkles,
  Brain,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDiagnosticResults } from "@/lib/diagnostic.functions";
import { explainQuestion } from "@/lib/tutor.functions";
import { QuestionVisual } from "@/components/QuestionVisual";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/results/$sessionId")({
  component: ResultsPage,
  head: () => ({ meta: [{ title: "Diagnostic Results — ScoreLab AI" }] }),
});

interface ResultsPayload {
  session: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    estimatedScore: number | null;
    rwCorrect: number;
    mathCorrect: number;
    totalQuestions: number;
    moduleDifficulty: string | null;
  };
  sectionTotals: {
    rwCorrect: number;
    rwTotal: number;
    mathCorrect: number;
    mathTotal: number;
    totalTimeSeconds: number;
  };
  skills: Array<{ category: string; correct: number; total: number; section: string }>;
  review: Array<{
    responseId: string;
    questionId: string;
    section: string;
    skillCategory: string;
    skillSubcategory: string | null;
    difficulty: number | null;
    questionText: string;
    choices: { A: string; B: string; C: string; D: string };
    correctAnswer: string | null;
    selectedAnswer: string | null;
    isCorrect: boolean | null;
    timeSpentSeconds: number;
    explanation: string | null;
    hasVisual: boolean;
    visualType: string | null;
    visualData: Json | null;
    visualSvg: string | null;
  }>;
}

function ResultsPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const getResults = useServerFn(getDiagnosticResults);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getResults({ data: { sessionId } })
      .then((res) => {
        if (!cancelled) setData(res as ResultsPayload);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load results");
      });
    return () => {
      cancelled = true;
    };
  }, [user, sessionId, getResults]);

  if (loading || (!data && !err)) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <AppNav />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <AppNav />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <Card className="p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Couldn't load results</h1>
            <p className="mt-2 text-muted-foreground">{err}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const total = data.session.estimatedScore ?? 0;
  // Recompute section scores from session totals if estimated scores aren't broken out per section.
  // We'll re-derive RW/Math from response counts using skill tally for an approximate split shown earlier.
  // For display, use the corrects we have.
  const weakest = [...data.skills]
    .filter((s) => s.total >= 2)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .slice(0, 3);

  const minutes = Math.round(data.sectionTotals.totalTimeSeconds / 60);
  const completedDate = data.session.completedAt
    ? new Date(data.session.completedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diagnostic Results</h1>
            {completedDate && (
              <p className="text-sm text-muted-foreground">
                Completed {completedDate} · {minutes} min
              </p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Score hero */}
        <Card className="p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-4 w-4" /> Baseline SAT Score
              </div>
              <div className="mt-2 text-7xl font-bold tracking-tight">{total}</div>
              <div className="text-sm text-muted-foreground">out of 1600</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Reading & Writing
                </div>
                <div className="mt-1 text-3xl font-bold">
                  {data.sectionTotals.rwCorrect}
                  <span className="text-base font-normal text-muted-foreground">
                    /{data.sectionTotals.rwTotal}
                  </span>
                </div>
                <Progress
                  value={
                    data.sectionTotals.rwTotal
                      ? (data.sectionTotals.rwCorrect / data.sectionTotals.rwTotal) * 100
                      : 0
                  }
                  className="mt-2 h-2"
                />
              </div>
              <div className="rounded-md border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Math</div>
                <div className="mt-1 text-3xl font-bold">
                  {data.sectionTotals.mathCorrect}
                  <span className="text-base font-normal text-muted-foreground">
                    /{data.sectionTotals.mathTotal}
                  </span>
                </div>
                <Progress
                  value={
                    data.sectionTotals.mathTotal
                      ? (data.sectionTotals.mathCorrect / data.sectionTotals.mathTotal) * 100
                      : 0
                  }
                  className="mt-2 h-2"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Recommended focus */}
        {weakest.length > 0 && (
          <Card className="p-6 border-accent/30 bg-accent-soft/40">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Recommended focus</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Practice these skills first — they have the most room to grow.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {weakest.map((s, i) => {
                const pct = Math.round((s.correct / s.total) * 100);
                return (
                  <div key={i} className="rounded-md border bg-card p-4">
                    <Badge variant="outline" className="text-xs">
                      {s.section === "math" ? "Math" : "RW"}
                    </Badge>
                    <div className="mt-2 font-semibold text-sm">{s.category}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.correct}/{s.total} correct · {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
            <Button asChild className="mt-5">
              <Link to="/practice">
                Start practice
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        )}

        {/* Full skill breakdown */}
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Skill breakdown
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            {(["reading_writing", "math"] as const).map((sec) => {
              const skills = data.skills
                .filter((s) => s.section === sec)
                .sort((a, b) => a.correct / a.total - b.correct / b.total);
              if (skills.length === 0) return null;
              return (
                <div key={sec}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {sec === "math" ? "Math" : "Reading & Writing"}
                  </div>
                  <div className="space-y-3">
                    {skills.map((s, i) => {
                      const pct = Math.round((s.correct / s.total) * 100);
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{s.category}</span>
                            <span className="text-muted-foreground">
                              {s.correct}/{s.total} · {pct}%
                            </span>
                          </div>
                          <Progress value={pct} className="mt-1 h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Per-question review */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Question review
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap any question to see the correct answer and explanation.
          </p>
          <div className="mt-4 space-y-2">
            {data.review.map((r, i) => (
              <ReviewRow key={r.responseId} idx={i + 1} item={r} />
            ))}
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/practice">
              Start practice
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function ReviewRow({ idx, item }: { idx: number; item: ResultsPayload["review"][number] }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const explainFn = useServerFn(explainQuestion);
  const correct = item.isCorrect === true;
  const skipped = item.selectedAnswer === null;

  const handleAsk = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      const res = await explainFn({
        data: {
          questionId: item.questionId,
          studentAnswer: item.selectedAnswer as "A" | "B" | "C" | "D" | null,
          followUp: null,
        },
      });
      setAiText(res.explanation);
    } catch (e) {
      setAiText(e instanceof Error ? e.message : "AI tutor unavailable.");
    } finally {
      setAiLoading(false);
    }
  };
  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-6">{idx}</span>
          {correct ? (
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
          ) : skipped ? (
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm truncate">
              {item.skillCategory}
              {item.skillSubcategory ? ` · ${item.skillSubcategory}` : ""}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {item.section === "math" ? "Math" : "RW"}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.timeSpentSeconds}s
              </span>
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-3 bg-secondary/20">
          <div className="whitespace-pre-wrap text-sm">{item.questionText}</div>
          <QuestionVisual
            hasVisual={item.hasVisual}
            visualType={item.visualType}
            visualData={item.visualData}
            visualSvg={item.visualSvg}
          />
          <div className="space-y-1.5">
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const isCorrect = item.correctAnswer === letter;
              const isSelected = item.selectedAnswer === letter;
              return (
                <div
                  key={letter}
                  className={`rounded border p-2.5 text-sm flex items-start gap-2 ${
                    isCorrect
                      ? "border-accent bg-accent-soft/40"
                      : isSelected
                        ? "border-destructive bg-destructive/10"
                        : "border-border"
                  }`}
                >
                  <span className="font-semibold">{letter}.</span>
                  <span className="flex-1">{item.choices[letter]}</span>
                  {isCorrect && (
                    <Badge variant="outline" className="text-[10px]">
                      Correct
                    </Badge>
                  )}
                  {isSelected && !isCorrect && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-destructive text-destructive"
                    >
                      Your answer
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          {item.explanation && (
            <div className="rounded-md bg-card border p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Explanation
              </div>
              <div className="whitespace-pre-wrap">{item.explanation}</div>
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" onClick={handleAsk} disabled={aiLoading}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Ask AI tutor
            </Button>
            {aiOpen && (
              <div className="mt-3 rounded-md border bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Brain className="h-3.5 w-3.5" />
                  AI tutor
                </div>
                {aiLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{aiText}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
