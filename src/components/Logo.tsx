import { GraduationCap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-primary">ScoreLab AI</span>
    </Link>
  );
}
