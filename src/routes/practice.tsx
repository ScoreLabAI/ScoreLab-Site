import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  CheckCircle2,
  XCircle,
  Sparkles,
  Play,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  startPractice,
  submitPracticeAnswer,
  endPractice,
  listSkillCategories,
} from "@/lib/practice.functions";
import { explainQuestion } from "@/lib/tutor.functions";
import { DesmosCalculator } from "@/components/DesmosCalculator";
import { QuestionVisual } from "@/components/QuestionVisual";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/practice")({
  component: PracticePage,
  head: () => ({ meta: [{ title: "Practice — ScoreLab AI" }] }),
});

interface PQuestion {
  id: string;
  section: "math" | "reading_writing";
  question_text: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  skill_category: string;
  skill_subcategory: string | null;
  difficulty: number;
  has_visual: boolean;
  visual_type: string | null;
  visual_data: Json | null;
  visual_svg: string | null;
}

type Phase = "setup" | "playing" | "summary";

function PracticePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [section, setSection] = useState<"mixed" | "math" | "reading_writing">("mixed");
  const [skillCategory, setSkillCategory] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [skills, setSkills] = useState<Array<{ section: string; category: string }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctAnswer: string;
    explanation: string;
    distractorNote: string | null;
  } | null>(null);
  const [stats, setStats] = useState({ correct: 0, answered: 0 });
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const startTime = useRef(Date.now());

  const startFn = useServerFn(startPractice);
  const submitFn = useServerFn(submitPracticeAnswer);
  const endFn = useServerFn(endPractice);
  const listFn = useServerFn(listSkillCategories);
  const explainFn = useServerFn(explainQuestion);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);
  useEffect(() => {
    listFn()
      .then((s) => setSkills(s as typeof skills))
      .catch(() => {});
  }, [listFn]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const res = await startFn({ data: { section, skillCategory: skillCategory ?? null, count } });
      setSessionId(res.sessionId);
      setQuestions(res.questions as PQuestion[]);
      setIdx(0);
      setSelected(null);
      setFeedback(null);
      setStats({ correct: 0, answered: 0 });
      startTime.current = Date.now();
      setPhase("playing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start practice");
    } finally {
      setBusy(false);
    }
  };

  const handleCheck = async () => {
    if (!sessionId || !questions[idx]) return;
    setBusy(true);
    try {
      const time = Math.min(900, Math.floor((Date.now() - startTime.current) / 1000));
      const res = await submitFn({
        data: {
          sessionId,
          questionId: questions[idx].id,
          selectedAnswer: selected,
          timeSpentSeconds: time,
        },
      });
      setFeedback({
        correct: res.isCorrect,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation ?? "",
        distractorNote: res.distractorNote,
      });
      setStats((s) => ({ correct: s.correct + (res.isCorrect ? 1 : 0), answered: s.answered + 1 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const handleNext = async () => {
    setSelected(null);
    setFeedback(null);
    setAiOpen(false);
    setAiText("");
    if (idx + 1 >= questions.length) {
      if (sessionId) await endFn({ data: { sessionId } }).catch(() => {});
      setPhase("summary");
    } else {
      setIdx(idx + 1);
      startTime.current = Date.now();
    }
  };

  const handleAsk = async () => {
    if (!questions[idx]) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      const res = await explainFn({
        data: {
          questionId: questions[idx].id,
          studentAnswer: selected,
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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {phase === "setup" && (
          <Card className="p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Play className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-center">Practice session</h1>
            <p className="mt-2 text-muted-foreground text-center">
              We'll weight questions toward your weakest skills, or you can target one.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium">Section</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["mixed", "reading_writing", "math"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSection(s);
                        setSkillCategory(null);
                      }}
                      className={`rounded-md border p-3 text-sm font-medium ${section === s ? "border-accent bg-accent-soft/40" : "border-border hover:border-accent/50"}`}
                    >
                      {s === "mixed" ? "Mixed" : s === "math" ? "Math" : "Reading & Writing"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Skill (optional)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSkillCategory(null)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${!skillCategory ? "border-accent bg-accent-soft/40" : "border-border"}`}
                  >
                    Weakest skills (auto)
                  </button>
                  {skills
                    .filter((s) => section === "mixed" || s.section === section)
                    .map((s) => (
                      <button
                        key={s.section + s.category}
                        onClick={() => setSkillCategory(s.category)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${skillCategory === s.category ? "border-accent bg-accent-soft/40" : "border-border hover:border-accent/50"}`}
                      >
                        {s.category}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Number of questions</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`rounded-md border p-2.5 text-sm font-medium ${count === n ? "border-accent bg-accent-soft/40" : "border-border hover:border-accent/50"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
              <Button onClick={handleStart} disabled={busy} className="flex-1">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    Start
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {phase === "playing" && questions[idx] && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {questions[idx].section === "math" ? "Math" : "Reading & Writing"}
                  </Badge>
                  <Badge variant="outline">{questions[idx].skill_category}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Q {idx + 1}/{questions.length} · {stats.correct}/{stats.answered} correct
                </div>
              </div>
              <Progress
                value={((idx + (feedback ? 1 : 0)) / questions.length) * 100}
                className="mt-3"
              />

              <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed">
                {questions[idx].question_text}
              </div>
              <QuestionVisual
                hasVisual={questions[idx].has_visual}
                visualType={questions[idx].visual_type}
                visualData={questions[idx].visual_data}
                visualSvg={questions[idx].visual_svg}
              />

              <div className="mt-6 space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const text = questions[idx][`answer_${letter.toLowerCase()}` as "answer_a"];
                  const isSelected = selected === letter;
                  const isCorrectAns = feedback && feedback.correctAnswer === letter;
                  const isWrongPick = feedback && isSelected && !feedback.correct;
                  return (
                    <button
                      key={letter}
                      onClick={() => !feedback && setSelected(letter)}
                      disabled={!!feedback}
                      className={`w-full text-left rounded-md border p-4 transition ${
                        isCorrectAns
                          ? "border-accent bg-accent-soft/40"
                          : isWrongPick
                            ? "border-destructive bg-destructive/10"
                            : isSelected
                              ? "border-accent ring-2 ring-accent/30"
                              : "border-border hover:border-accent/50"
                      } ${feedback ? "cursor-default" : ""}`}
                    >
                      <span className="font-semibold mr-3">{letter}.</span>
                      <span>{text}</span>
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div
                  className={`mt-5 rounded-md border p-4 ${feedback.correct ? "border-accent bg-accent-soft/30" : "border-destructive/40 bg-destructive/5"}`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {feedback.correct ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        Not quite — answer is {feedback.correctAnswer}
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{feedback.explanation}</p>
                  {feedback.distractorNote && !feedback.correct && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Why your pick:</span>{" "}
                      {feedback.distractorNote}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleAsk}>
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Ask AI tutor
                  </Button>
                  {aiOpen && (
                    <div className="mt-4 rounded-md border bg-card p-3">
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
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                {!feedback ? (
                  <Button onClick={handleCheck} disabled={!selected || busy}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      "Check answer"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    {idx + 1 >= questions.length ? "Finish" : "Next question"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}

        {phase === "summary" && (
          <Card className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
            <h2 className="mt-4 text-2xl font-bold">Session complete</h2>
            <p className="mt-2 text-muted-foreground">
              You got {stats.correct} of {stats.answered} correct (
              {stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%).
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button
                onClick={() => {
                  setPhase("setup");
                }}
              >
                Practice more
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </main>
      {phase === "playing" && questions[idx]?.section === "math" && <DesmosCalculator />}
    </div>
  );
}
