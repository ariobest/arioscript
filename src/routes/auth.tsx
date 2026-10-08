import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mail, Lock, User as UserIcon, Chrome } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/components/site/Layout";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ARIO SCRIPTS" }, { name: "description", content: "Sign in to save favorite Lua scripts and manage your ARIO SCRIPTS account." }, { property: "og:title", content: "Sign in — ARIO SCRIPTS" }, { property: "og:description", content: "Sign in to save favorite Lua scripts and manage your ARIO SCRIPTS account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const alreadySignedInNotified = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const registrationOpen = settings?.registration_enabled !== false;

  useEffect(() => {
    if (!user || alreadySignedInNotified.current) return;
    alreadySignedInNotified.current = true;
    toast.info("You are already signed in.");
    navigate({ to: "/" });
  }, [user, navigate]);

  async function signInWithGoogle() {
    if (user) {
      navigate({ to: "/" });
      return;
    }
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (user) {
      if (!alreadySignedInNotified.current) {
        alreadySignedInNotified.current = true;
        toast.info("You are already signed in.");
      }
      navigate({ to: "/" });
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        if (!registrationOpen) throw new Error("Registration is currently closed.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username: username || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="glass fade-up rounded-2xl p-7">
        <div className={`auth-cat-wrap ${passwordFocus ? "auth-cat-away" : ""}`} aria-hidden="true"><span className="auth-cat mx-auto h-16 w-16" style={{ WebkitMaskImage: "url(https://arioscript.lovable.app/__l5e/assets-v1/193455b7-1a87-4e65-950a-dbf7cc575bad/ario-logo.png)", maskImage: "url(https://arioscript.lovable.app/__l5e/assets-v1/193455b7-1a87-4e65-950a-dbf7cc575bad/ario-logo.png)", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }} /></div>
        <h1 className="mt-4 text-center font-display text-xl font-bold">
          {mode === "signin" ? "Sign in to ARIO SCRIPTS" : "Create your account"}
        </h1>
        <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Secure authentication</div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Save favorites, report scripts and earn badges.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn btn-ghost w-full justify-center gap-2 border border-border/80 bg-card/70 hover:border-primary/40 hover:bg-primary/5">
            <Chrome size={17} />
            Google
          </button>
        </div>
        <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">or continue with email</span><span className="h-px flex-1 bg-border" /></div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="input-base !pl-9" />
            </div>
          )}
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-base !pl-9" />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="password" required minLength={6} value={password} onFocus={() => setPasswordFocus(true)} onBlur={() => setPasswordFocus(false)} onChange={(e) => { setPassword(e.target.value); setPasswordFocus(e.target.value.length > 0); }} placeholder="Password" className="input-base !pl-9" />
          </div>

          {mode === "signin" && (
            <div className="flex justify-end">
              <button type="button" onClick={() => navigate({ to: "/forgot-password" })} className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <button disabled={busy} className="btn btn-primary w-full">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? registrationOpen ? "No account yet?" : "Registration is currently closed." : "Already registered?"}{" "}
          {(registrationOpen || mode === "signup") && <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary">
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>}
        </p>
      </div>
    </div>
  );
}
