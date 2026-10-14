import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, LogOut, Settings, Shield } from "lucide-react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
  { to: "/college-targets", label: "College Targets" },
];

export function AppNav() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">ScoreLab AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active ? "text-primary bg-primary-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm">
              <div className="font-medium">{profile?.full_name || "Student"}</div>
              <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
              <Settings className="mr-2 h-4 w-4" /> Account
            </DropdownMenuItem>
            {profile?.role === "admin" && (
              <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                <Shield className="mr-2 h-4 w-4" /> Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
