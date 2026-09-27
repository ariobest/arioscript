import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_banned: boolean;
  is_disabled: boolean;
  last_seen: string;
  created_at: string;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: "user" | "moderator" | "admin" | null;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null, session: null, profile: null, role: null,
  isAdmin: false, isStaff: false, loading: true,
  refresh: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AuthValue["role"]>(null);
  const [loading, setLoading] = useState(true);

  async function load(uid: string | undefined) {
    if (!uid) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    const list = (roles ?? []).map((r) => r.role as string);
    setRole(list.includes("admin") ? "admin" : list.includes("moderator") ? "moderator" : "user");
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void load(s?.user?.id);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // presence heartbeat
  useEffect(() => {
    if (!session?.user) return;
    const beat = () => void supabase.rpc("touch_presence");
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [session?.user?.id]);

  const value: AuthValue = {
    user: session?.user ?? null,
    session,
    profile,
    role,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "moderator",
    loading,
    refresh: () => load(session?.user?.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
