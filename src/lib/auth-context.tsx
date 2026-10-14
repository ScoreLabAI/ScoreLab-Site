import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccessTier = "starter" | "student" | "pro" | "founding_client";
export type AppRole = "student" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  access_type: AccessTier;
  target_test_date: string | null;
  onboarding_completed: boolean;
  subscription_status: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,access_type,target_test_date,onboarding_completed,subscription_status")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    // Install a fetch interceptor that attaches the Supabase access token to
    // server-function calls so requireSupabaseAuth middleware can authenticate them.
    if (typeof window !== "undefined" && !(window as unknown as { __sfAuthPatched?: boolean }).__sfAuthPatched) {
      (window as unknown as { __sfAuthPatched?: boolean }).__sfAuthPatched = true;
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/_serverFn/")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
            init = { ...(init ?? {}), headers };
          }
        }
        return origFetch(input as RequestInfo, init);
      };
    }

    // Set up listener BEFORE getSession (per Supabase docs)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
