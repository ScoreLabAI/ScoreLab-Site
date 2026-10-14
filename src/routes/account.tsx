import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Account — ScoreLab AI" }] }),
});

const PLAN_INFO: Record<string, { label: string; description: string; badgeClass: string }> = {
  starter: { label: "Starter", description: "Free — diagnostic only", badgeClass: "bg-muted text-muted-foreground" },
  student: { label: "Student", description: "$29/month", badgeClass: "bg-accent/15 text-accent" },
  pro: { label: "Pro", description: "$59/month", badgeClass: "bg-primary text-primary-foreground" },
  founding_client: { label: "Founding Client", description: "Complimentary access", badgeClass: "bg-warning/20 text-warning-foreground" },
};

function AccountPage() {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (profile) {
      setFullName(profile.full_name ?? "");
      setTestDate(profile.target_test_date ?? "");
    }
  }, [loading, user, profile, navigate]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      target_test_date: testDate || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Profile updated");
  };

  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const plan = PLAN_INFO[profile.access_type] ?? PLAN_INFO.starter;
  const showParentReports = profile.access_type === "pro" || profile.access_type === "founding_client";

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="mt-1 text-muted-foreground">Manage your profile and subscription.</p>
        </div>

        {/* Profile */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" className="mt-1.5" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-1.5" value={profile.email ?? ""} disabled />
            </div>
            <div>
              <Label htmlFor="date">Target test date</Label>
              <Input id="date" type="date" className="mt-1.5" value={testDate} onChange={e => setTestDate(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Subscription</h2>
            <Badge className={plan.badgeClass}>{plan.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

          {profile.access_type === "starter" && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-5">
                <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Student</div>
                <div className="mt-2 text-3xl font-bold">$29<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> Unlimited practice</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> 15 hrs AI tutor/mo</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> Progress tracking</li>
                </ul>
                <Button className="mt-5 w-full" disabled>Upgrade (coming soon)</Button>
              </div>
              <div className="rounded-lg border-2 border-accent p-5 bg-accent-soft/30">
                <div className="text-sm font-semibold uppercase tracking-wider text-accent">Pro</div>
                <div className="mt-2 text-3xl font-bold">$59<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> Everything in Student</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> Unlimited AI tutor</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /> Parent reports</li>
                </ul>
                <Button className="mt-5 w-full" disabled>Upgrade (coming soon)</Button>
              </div>
            </div>
          )}

          {(profile.access_type === "student" || profile.access_type === "pro") && (
            <div className="mt-5">
              <Button variant="outline" disabled>
                <ExternalLink className="mr-2 h-4 w-4" /> Manage billing (coming soon)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Stripe customer portal launches with payments rollout.</p>
            </div>
          )}

          {profile.access_type === "founding_client" && (
            <div className="mt-5 flex items-center gap-2 text-sm text-warning-foreground">
              <Sparkles className="h-4 w-4" /> Thank you for being a founding member.
            </div>
          )}
        </Card>

        {/* Parent reports */}
        {showParentReports && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Parent reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">Send a weekly progress summary to a parent or guardian.</p>
            <div className="mt-6 flex items-center justify-between">
              <Label htmlFor="reports">Enable parent reports</Label>
              <Switch id="reports" disabled />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Email delivery launches with the email rollout.</p>
          </Card>
        )}

        {/* Notifications */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <Label htmlFor="weekly">Weekly progress email</Label>
              <p className="text-xs text-muted-foreground">A summary of your study week, every Sunday.</p>
            </div>
            <Switch id="weekly" disabled />
          </div>
        </Card>
      </main>
    </div>
  );
}
