import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ChevronRight, Plus, X, Calendar, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Welcome to ScoreLab AI" }] }),
});

interface Target { name: string; sat: string; priority: "reach" | "target" | "safety"; }

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [colleges, setColleges] = useState<Target[]>([]);
  const [draft, setDraft] = useState<Target>({ name: "", sat: "", priority: "target" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (profile?.onboarding_completed) { navigate({ to: "/dashboard" }); return; }
    if (profile?.full_name) setFullName(profile.full_name);
  }, [loading, user, profile, navigate]);

  const finish = async (skipDiagnostic: boolean) => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: fullName || profile?.full_name,
      target_test_date: testDate || null,
      onboarding_completed: true,
    }).eq("id", user.id);

    if (colleges.length > 0) {
      await supabase.from("college_targets").insert(
        colleges.map(c => ({
          student_id: user.id,
          college_name: c.name,
          average_sat: c.sat ? parseInt(c.sat) : null,
          priority: c.priority,
        }))
      );
    }
    await refreshProfile();
    setSaving(false);
    navigate({ to: skipDiagnostic ? "/dashboard" : "/diagnostic" });
  };

  const addCollege = () => {
    if (!draft.name) return;
    if (colleges.length >= 5) { toast.error("Up to 5 schools"); return; }
    setColleges([...colleges, draft]);
    setDraft({ name: "", sat: "", priority: "target" });
  };

  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6"><Logo to="/onboarding" /></div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl p-8 md:p-10 shadow-[var(--shadow-elevated)]">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-accent" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome to ScoreLab AI</h1>
              <p className="mt-2 text-muted-foreground">
                We'll diagnose your strengths, build a personalized plan, and pair you with an AI tutor that explains every mistake. Three quick steps.
              </p>
              <div className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="name">Your full name</Label>
                  <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1.5" placeholder="Jane Smith" />
                </div>
              </div>
              <div className="mt-10 flex justify-end">
                <Button size="lg" onClick={() => setStep(2)} disabled={!fullName.trim()}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Calendar className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">When is your SAT?</h1>
              <p className="mt-2 text-muted-foreground">Knowing your test date lets us pace your study plan.</p>
              <div className="mt-8">
                <Label htmlFor="date">Target test date</Label>
                <Input id="date" type="date" value={testDate} onChange={e => setTestDate(e.target.value)} className="mt-1.5" />
              </div>
              <div className="mt-10 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button size="lg" onClick={() => setStep(3)} disabled={!testDate}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">Where are you applying?</h1>
              <p className="mt-2 text-muted-foreground">Add up to 5 colleges so we can show you your gap. Skip if you're not sure yet.</p>

              <div className="mt-8 space-y-3">
                {colleges.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.priority} • SAT avg {c.sat || "—"}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setColleges(colleges.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {colleges.length < 5 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <Input className="md:col-span-5" placeholder="College name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <Input className="md:col-span-3" placeholder="Avg SAT" type="number" value={draft.sat} onChange={e => setDraft({ ...draft, sat: e.target.value })} />
                    <Select value={draft.priority} onValueChange={(v: "reach"|"target"|"safety") => setDraft({ ...draft, priority: v })}>
                      <SelectTrigger className="md:col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reach">Reach</SelectItem>
                        <SelectItem value="target">Target</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="md:col-span-1" onClick={addCollege}><Plus className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>

              <div className="mt-10 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" onClick={() => setStep(4)}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">You're ready</h1>
              <p className="mt-2 text-muted-foreground">
                The diagnostic is two adaptive modules — about 54 questions in total. It maps every skill so we can build a plan that actually works.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                {[
                  { n: "~60", l: "Minutes" },
                  { n: "54", l: "Questions" },
                  { n: "Adaptive", l: "Format" },
                ].map(s => (
                  <div key={s.l} className="rounded-md border border-border bg-secondary/40 p-4">
                    <div className="text-xl font-bold text-primary">{s.n}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>Skip for now</Button>
                <Button size="lg" onClick={() => finish(false)} disabled={saving}>
                  {saving ? "Saving…" : "Begin diagnostic"} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
