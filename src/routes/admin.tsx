import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Users, CreditCard, Sparkles, FileText, Activity, Database, Loader2, Upload, Copy, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { seedQuestionBank } from "@/lib/questions.functions";
import { importQuestions } from "@/lib/question-import.functions";
import { parseQuestionsPayload, IMPORT_TEMPLATE } from "@/lib/question-import";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Question Bank | ScoreLab AI" },
      { name: "description", content: "Manage ScoreLab AI users and review the SAT question bank." },
      { property: "og:title", content: "Admin Question Bank | ScoreLab AI" },
      { property: "og:description", content: "Manage ScoreLab AI users and review the SAT question bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  access_type: string;
  subscription_status: string | null;
  created_at: string;
}

interface AdminQuestionRow {
  id: string;
  section: string;
  skill_category: string;
  skill_subcategory: string | null;
  difficulty: number;
  question_text: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
  explanation: string | null;
  is_diagnostic: boolean;
  is_active: boolean;
  created_at: string;
}

const ACCESS_TIERS = ["starter", "student", "pro", "founding_client"] as const;
const QUESTIONS_PER_PAGE = 25;

function AdminPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, founding: 0, diagnostics: 0, sessions: 0, questions: 0 });
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [questions, setQuestions] = useState<AdminQuestionRow[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<AdminQuestionRow | null>(null);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionPage, setQuestionPage] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const seedFn = useServerFn(seedQuestionBank);
  const importFn = useServerFn(importQuestions);

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const questions = parseQuestionsPayload(text);
      if (
        replaceOnImport &&
        !window.confirm(
          `Retire the current active question bank and replace it with ${questions.length} uploaded questions?`,
        )
      ) {
        return;
      }
      const res = await importFn({ data: { questions, replace: replaceOnImport } });
      const dupNote = res.duplicates ? ` · ${res.duplicates} duplicates skipped` : "";
      if (res.rejected > 0) {
        console.warn("Import issues:", res.issues);
        toast.warning(
          `Imported ${res.inserted} questions${dupNote} · ${res.rejected} invalid (see console for details)`,
        );
      } else {
        toast.success(
          `Imported ${res.inserted} questions${dupNote}${res.retired ? ` · retired ${res.retired} old ones` : ""}`,
        );
      }
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (profile && profile.role !== "admin") { navigate({ to: "/dashboard" }); return; }
    if (profile?.role === "admin") void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile]);

  const loadAll = async () => {
    const { data: rows } = await supabase
      .from("profiles")
      .select("id,email,full_name,access_type,subscription_status,created_at")
      .order("created_at", { ascending: false });
    setUsers((rows ?? []) as AdminUserRow[]);

    const total = rows?.length ?? 0;
    const active = rows?.filter(r => r.access_type === "student" || r.access_type === "pro").length ?? 0;
    const founding = rows?.filter(r => r.access_type === "founding_client").length ?? 0;

    const { count: diagCount } = await supabase
      .from("test_sessions").select("id", { count: "exact", head: true }).eq("session_type", "diagnostic");
    const { count: sessCount } = await supabase
      .from("test_sessions").select("id", { count: "exact", head: true });
    const { count: qCount } = await supabase
      .from("questions").select("id", { count: "exact", head: true }).eq("is_active", true);

    setStats({ total, active, founding, diagnostics: diagCount ?? 0, sessions: sessCount ?? 0, questions: qCount ?? 0 });
    await loadQuestions(questionPage, questionSearch);
  };

  const loadQuestions = async (page: number, searchTerm: string) => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    const from = page * QUESTIONS_PER_PAGE;
    const to = from + QUESTIONS_PER_PAGE - 1;
    let query = supabase
      .from("questions")
      .select(
        "id,section,skill_category,skill_subcategory,difficulty,question_text,answer_a,answer_b,answer_c,answer_d,correct_answer,explanation,is_diagnostic,is_active,created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    const trimmed = searchTerm.trim();
    if (trimmed) {
      const safeSearch = trimmed.replace(/[,%()]/g, " ");
      query = query.or(`question_text.ilike.%${safeSearch}%,skill_category.ilike.%${safeSearch}%,skill_subcategory.ilike.%${safeSearch}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      setQuestions([]);
      setQuestionCount(0);
      setQuestionsError(error.message);
    } else {
      setQuestions((data ?? []) as AdminQuestionRow[]);
      setQuestionCount(count ?? 0);
    }
    setQuestionsLoading(false);
  };

  useEffect(() => {
    if (profile?.role !== "admin") return;
    const timer = window.setTimeout(() => {
      void loadQuestions(questionPage, questionSearch);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionPage, questionSearch, profile?.role]);

  const handleSeed = async (replace: boolean) => {
    if (replace && !window.confirm("Retire the current question bank and replace it with a freshly generated one?")) return;
    setSeeding(true);
    toast.info("Generating questions… this can take a couple of minutes.");
    try {
      const res = await seedFn({ data: { replace } });
      const extra = res?.rejected ? ` · ${res.rejected} rejected by quality checks` : "";
      if (res?.errors && res.errors.length > 0) {
        toast.warning(`Inserted ${res.inserted} questions${extra} with ${res.errors.length} issues`);
        console.warn("Seed errors:", res.errors);
      } else {
        toast.success(`Inserted ${res?.inserted ?? 0} questions${extra}`);
      }
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };


  const updateTier = async (newTier: string) => {
    if (!selected) return;
    setSavingTier(true);
    const { error } = await supabase
      .from("profiles")
      .update({ access_type: newTier as typeof ACCESS_TIERS[number] })
      .eq("id", selected.id);
    setSavingTier(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Access updated");
    setSelected({ ...selected, access_type: newTier });
    await loadAll();
  };

  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (profile.role !== "admin") return null;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-muted-foreground">Manage users and view platform stats.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.total} />
          <StatCard icon={CreditCard} label="Active Subs" value={stats.active} />
          <StatCard icon={Sparkles} label="Founding" value={stats.founding} />
          <StatCard icon={FileText} label="Diagnostics" value={stats.diagnostics} />
          <StatCard icon={Activity} label="Sessions" value={stats.sessions} />
          <StatCard icon={Database} label="Questions" value={stats.questions} />
        </div>

        {/* Question bank */}
        <Card className="p-6 flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold">Question bank</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate ~60 Digital SAT items across all skills using AI, using official item formats and
              stems. Items that fail quality checks are discarded. Takes 1-3 minutes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSeed(false)} disabled={seeding}>
              {seeding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="mr-2 h-4 w-4" />Add questions</>}
            </Button>
            <Button onClick={() => handleSeed(true)} disabled={seeding}>
              Regenerate bank
            </Button>
          </div>
        </Card>

        {/* Upload your own questions */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Upload your own questions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a JSON file of hand-authored questions. Each item is validated before it is
              saved; invalid items are skipped and reported.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              checked={replaceOnImport}
              onChange={(e) => setReplaceOnImport(e.target.checked)}
            />
            <span>
              Replace the existing bank — retire all currently active questions and use only what I
              upload.
            </span>
          </label>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              id="question-import-file"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              onClick={() => document.getElementById("question-import-file")?.click()}
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Choose JSON file</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(IMPORT_TEMPLATE);
                toast.success("Template copied — paste it to Claude as the required format");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />Copy JSON template
            </Button>
          </div>

          <details className="rounded-md border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">Required format</summary>
            <p className="mt-3 text-sm text-muted-foreground">
              A JSON array, or an object with a <code>questions</code> array. Required per item:{" "}
              <code>section</code> ("math" or "reading_writing"), <code>skill_category</code>,{" "}
              <code>difficulty</code> (1–3), <code>question_text</code>, <code>answer_a</code>–
              <code>answer_d</code>, <code>correct_answer</code> ("A"–"D"). Optional:{" "}
              <code>skill_subcategory</code>, <code>explanation</code>, per-choice{" "}
              <code>distractor_*_explanation</code>, <code>is_diagnostic</code>.
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">{IMPORT_TEMPLATE}</pre>
          </details>
        </Card>


        {/* Question browser */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Browse questions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {questionCount.toLocaleString()} questions in the bank. Select a row to review the full item.
              </p>
            </div>
            <Input
              aria-label="Search questions"
              placeholder="Search prompt or skill…"
              value={questionSearch}
              onChange={(event) => {
                setQuestionSearch(event.target.value);
                setQuestionPage(0);
              }}
              className="md:w-80"
            />
          </div>

          {questionsError ? (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Questions could not be loaded: {questionsError}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Use</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Open</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow
                      key={question.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <TableCell className="max-w-md font-medium">
                        <span className="line-clamp-2">{question.question_text}</span>
                      </TableCell>
                      <TableCell>{question.section === "math" ? "Math" : "Reading & Writing"}</TableCell>
                      <TableCell>
                        <div>{question.skill_category}</div>
                        {question.skill_subcategory && <div className="text-xs text-muted-foreground">{question.skill_subcategory}</div>}
                      </TableCell>
                      <TableCell>{question.difficulty}</TableCell>
                      <TableCell><Badge variant="outline">{question.is_diagnostic ? "Diagnostic" : "Practice"}</Badge></TableCell>
                      <TableCell><Badge variant={question.is_active ? "default" : "secondary"}>{question.is_active ? "Active" : "Retired"}</Badge></TableCell>
                      <TableCell><Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></TableCell>
                    </TableRow>
                  ))}
                  {!questionsLoading && questions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No matching questions found.</TableCell></TableRow>
                  )}
                  {questionsLoading && (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading questions…</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Page {questionPage + 1} of {Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_PAGE))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous question page"
                title="Previous page"
                disabled={questionPage === 0 || questionsLoading}
                onClick={() => setQuestionPage((page) => Math.max(0, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next question page"
                title="Next page"
                disabled={(questionPage + 1) * QUESTIONS_PER_PAGE >= questionCount || questionsLoading}
                onClick={() => setQuestionPage((page) => page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>


        {/* Users table */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
            <h2 className="text-lg font-semibold">Users</h2>
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="md:w-72"
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.access_type.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.subscription_status ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Sheet open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            {selectedQuestion && (
              <>
                <SheetHeader>
                  <SheetTitle>Question review</SheetTitle>
                  <SheetDescription>
                    {selectedQuestion.section === "math" ? "Math" : "Reading & Writing"} · {selectedQuestion.skill_category} · Level {selectedQuestion.difficulty}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedQuestion.is_active ? "Active" : "Retired"}</Badge>
                    <Badge variant="outline">{selectedQuestion.is_diagnostic ? "Diagnostic" : "Practice only"}</Badge>
                    {selectedQuestion.skill_subcategory && <Badge variant="secondary">{selectedQuestion.skill_subcategory}</Badge>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6">{selectedQuestion.question_text}</div>
                  <div className="space-y-2">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const answer = selectedQuestion[`answer_${letter.toLowerCase()}` as "answer_a" | "answer_b" | "answer_c" | "answer_d"];
                      const correct = selectedQuestion.correct_answer === letter;
                      return (
                        <div key={letter} className={`rounded-md border p-3 text-sm ${correct ? "border-primary bg-primary/10" : "border-border"}`}>
                          <span className="mr-2 font-semibold">{letter}.</span>{answer}
                          {correct && <Badge className="ml-2">Correct</Badge>}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Explanation</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {selectedQuestion.explanation || "No explanation provided."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-md">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.full_name || "User"}</SheetTitle>
                  <SheetDescription>{selected.email}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Access tier</label>
                    <Select value={selected.access_type} onValueChange={updateTier} disabled={savingTier}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCESS_TIERS.map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use "Founding Client" to grant complimentary Pro access.
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-4 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{selected.subscription_status ?? "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{new Date(selected.created_at).toLocaleDateString()}</span></div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}
