import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/college-targets")({
  component: () => (
    <div className="min-h-screen bg-secondary/30">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <Card className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">College targets coming soon</h1>
          <p className="mt-2 text-muted-foreground">Track your gap to your dream schools. Ships next phase.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to dashboard</Link></Button>
        </Card>
      </main>
    </div>
  ),
});
