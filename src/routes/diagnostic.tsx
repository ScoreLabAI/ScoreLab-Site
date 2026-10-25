import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, BarChart3, Clock, CheckCircle2, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { startDiagnostic, submitModule1, completeDiagnostic } from "@/lib/diagnostic.functions";
import { DesmosCalculator } from "@/components/DesmosCalculator";
import { QuestionVisual } from "@/components/QuestionVisual";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/diagnostic")({
  component: DiagnosticPage,
  head: () => ({ meta: [{ title: "Diagnostic Test — ScoreLab AI" }] }),
});

interface DiagnosticQuestion {
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

type Phase = "intro" | "module1" | "module1-done" | "module2" | "complete";
type Answer = {
  questionId: string;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  timeSpentSeconds: number;
};

interface Results {
  total: number;
  math: number;
  readingWriting: number;
  rwCorrect: number;
  mathCorrect: number;
  skills: Array<{ category: string; sub: string | null; correct: number; total: number }>;
}

function DiagnosticPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, "A" | "B" | "C" | "D" | null>>(new Map());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [m2Difficulty, setM2Difficulty] = useState<{
    rw: "easy" | "hard";
    math: "easy" | "hard";
  } | null>(null);
  const questionStartTime = useRef(Date.now());
  const questionTimes = useRef(new Map<string, number>());

  const startFn = useServerFn(startDiagnostic);
  const submitM1Fn = useServerFn(submitModule1);
  const completeFn = useServerFn(completeDiagnostic);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Track time per question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIdx, phase]);

  const recordTime = (qId: string) => {
    const elapsed = Math.min(600, Math.floor((Date.now() - questionStartTime.current) / 1000));
    const prev = questionTimes.current.get(qId) ?? 0;
    questionTimes.current.set(qId, prev + elapsed);
    questionStartTime.current = Date.now();
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      const res = await startFn();
      setSessionId(res.sessionId);
      setQuestions(res.questions as DiagnosticQuestion[]);
      setAnswers(new Map());
      setCurrentIdx(0);
      questionTimes.current = new Map();
      setPhase("module1");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start diagnostic");
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = (ans: "A" | "B" | "C" | "D") => {
    const q = questions[currentIdx];
    setAnswers((prev) => new Map(prev).set(q.id, ans));
  };

  const handleNext = () => {
    const q = questions[currentIdx];
    recordTime(q.id);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    const q = questions[currentIdx];
    recordTime(q.id);
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleSubmitModule1 = async () => {
    if (!sessionId) return;
    const q = questions[currentIdx];
    recordTime(q.id);

    setBusy(true);
    try {
      const payload = {
        sessionId,
        answers: questions.map<Answer>((qq) => ({
          questionId: qq.id,
          selectedAnswer: answers.get(qq.id) ?? null,
          timeSpentSeconds: questionTimes.current.get(qq.id) ?? 0,
        })),
      };
      const res = await submitM1Fn({ data: payload });
      setM2Difficulty({ rw: res.rwM2Difficulty, math: res.mathM2Difficulty });
      setQuestions(res.questions as DiagnosticQuestion[]);
      setAnswers(new Map());
      setCurrentIdx(0);
      questionTimes.current = new Map();
      setPhase("module1-done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit module 1");
    } finally {
      setBusy(false);
    }
  };

  const handleStartModule2 = () => {
    setPhase("module2");
  };

  const handleSubmitModule2 = async () => {
    if (!sessionId || !m2Difficulty) return;
    const q = questions[currentIdx];
    recordTime(q.id);

    setBusy(true);
    try {
      const payload = {
        sessionId,
        answers: questions.map<Answer>((qq) => ({
          questionId: qq.id,
          selectedAnswer: answers.get(qq.id) ?? null,
          timeSpentSeconds: questionTimes.current.get(qq.id) ?? 0,
        })),
        rwM2Difficulty: m2Difficulty.rw,
        mathM2Difficulty: m2Difficulty.math,
      };
      await completeFn({ data: payload });
      navigate({ to: "/results/$sessionId", params: { sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit diagnostic");
    } finally {
      setBusy(false);
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
        {phase === "intro" && <IntroCard onStart={handleStart} busy={busy} />}
        {(phase === "module1" || phase === "module2") && questions.length > 0 && (
          <QuestionCard
            question={questions[currentIdx]}
            index={currentIdx}
            total={questions.length}
            selected={answers.get(questions[currentIdx].id) ?? null}
            onSelect={handleSelect}
            onPrev={handlePrev}
            onNext={handleNext}
            onSubmit={phase === "module1" ? handleSubmitModule1 : handleSubmitModule2}
            phase={phase}
            answeredCount={Array.from(answers.values()).filter(Boolean).length}
            busy={busy}
          />
        )}
        {phase === "module1-done" && <Module1DoneCard onContinue={handleStartModule2} />}
        {phase === "complete" && results && <ResultsCard results={results} />}
      </main>
      {(phase === "module1" || phase === "module2") &&
        questions.length > 0 &&
        questions[currentIdx]?.section === "math" && <DesmosCalculator />}
    </div>
  );
}

function IntroCard({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <Card className="p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-center">Adaptive Diagnostic Test</h1>
      <p className="mt-2 text-muted-foreground text-center">
        Get a baseline SAT score across Reading & Writing and Math.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Reading & Writing
          </div>
          <div className="mt-1 font-semibold">2 modules · 27 questions each</div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Math</div>
          <div className="mt-1 font-semibold">2 modules · 22 questions each</div>
        </div>
      </div>
      <div className="mt-6 rounded-md bg-secondary/50 p-4 text-sm text-muted-foreground">
        Module 2 difficulty adapts based on your Module 1 performance — just like the real digital
        SAT. Plan for ~45 minutes. You can navigate within a module but can&apos;t go back after
        submitting.
      </div>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Link>
        </Button>
        <Button onClick={onStart} disabled={busy} className="flex-1">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            <>
              Start diagnostic
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function QuestionCard(props: {
  question: DiagnosticQuestion;
  index: number;
  total: number;
  selected: "A" | "B" | "C" | "D" | null;
  onSelect: (ans: "A" | "B" | "C" | "D") => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  phase: Phase;
  answeredCount: number;
  busy: boolean;
}) {
  const {
    question,
    index,
    total,
    selected,
    onSelect,
    onPrev,
    onNext,
    onSubmit,
    phase,
    answeredCount,
    busy,
  } = props;
  const isLast = index === total - 1;
  const moduleLabel = phase === "module1" ? "Module 1" : "Module 2";
  const sectionLabel = question.section === "math" ? "Math" : "Reading & Writing";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{moduleLabel}</Badge>
          <Badge variant="secondary">{sectionLabel}</Badge>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> Question {index + 1} of {total}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mt-3" />

      <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed">
        {question.question_text}
      </div>
      <QuestionVisual
        hasVisual={question.has_visual}
        visualType={question.visual_type}
        visualData={question.visual_data}
        visualSvg={question.visual_svg}
      />

      <div className="mt-6 space-y-2">
        {(["A", "B", "C", "D"] as const).map((letter) => {
          const text = question[`answer_${letter.toLowerCase()}` as "answer_a"];
          const isSelected = selected === letter;
          return (
            <button
              key={letter}
              onClick={() => onSelect(letter)}
              className={`w-full text-left rounded-md border p-4 transition ${
                isSelected
                  ? "border-accent bg-accent-soft/40 ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50 hover:bg-secondary/50"
              }`}
            >
              <span className="font-semibold mr-3">{letter}.</span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onPrev} disabled={index === 0 || busy}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="text-xs text-muted-foreground">
          {answeredCount} / {total} answered
        </div>
        {isLast ? (
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit module
                <Flag className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={busy}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function Module1DoneCard({ onContinue }: { onContinue: () => void }) {
  return (
    <Card className="p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
      <h2 className="mt-4 text-2xl font-bold">Module 1 complete</h2>
      <p className="mt-2 text-muted-foreground">
        Module 2 has been adapted to your performance. Ready to continue?
      </p>
      <Button onClick={onContinue} className="mt-6">
        Start Module 2<ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
}

function ResultsCard({ results }: { results: Results }) {
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Your baseline score
        </div>
        <div className="mt-2 text-6xl font-bold tracking-tight">{results.total}</div>
        <div className="mt-1 text-sm text-muted-foreground">out of 1600</div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Reading & Writing
            </div>
            <div className="mt-1 text-3xl font-bold">{results.readingWriting}</div>
            <div className="text-xs text-muted-foreground">{results.rwCorrect} correct</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Math</div>
            <div className="mt-1 text-3xl font-bold">{results.math}</div>
            <div className="text-xs text-muted-foreground">{results.mathCorrect} correct</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Skill breakdown</h3>
        <div className="mt-4 space-y-3">
          {results.skills
            .sort((a, b) => a.correct / a.total - b.correct / b.total)
            .map((s, i) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {s.category}
                      {s.sub ? ` · ${s.sub}` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {s.correct}/{s.total} · {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="mt-1 h-2" />
                </div>
              );
            })}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to="/progress">View progress</Link>
        </Button>
      </div>
    </div>
  );
}
