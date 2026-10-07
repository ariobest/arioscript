import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — ARIO SCRIPTS" }, { name: "description", content: "Reset your ARIO SCRIPTS account password." }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("If that email is registered, a reset link is on the way.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="glass fade-up rounded-2xl p-7">
        <button type="button" onClick={() => navigate({ to: "/auth" })} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={15} /> Back to sign in
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Lock size={25} />
        </div>
        <h1 className="mt-5 text-center font-display text-xl font-bold">Forgot your password?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your account email and we'll send you a secure password reset link.
        </p>

        {!sent ? (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-base !pl-9" />
            </div>
            <button disabled={busy} className="btn btn-primary w-full">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium">Check your inbox</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, you'll receive a reset link shortly.
            </p>
            <button type="button" onClick={() => setSent(false)} className="mt-4 text-xs font-semibold text-primary">
              Try another email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
