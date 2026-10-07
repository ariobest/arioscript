import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — ARIO SCRIPTS" }, { name: "description", content: "Choose a new ARIO SCRIPTS account password." }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (mounted) setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update your password.");
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
        <h1 className="mt-5 text-center font-display text-xl font-bold">Set a new password</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {ready ? "Choose a strong new password for your account." : "Open this page from the password reset email to continue."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="input-base" disabled={!ready} />
          <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="input-base" disabled={!ready} />
          <button disabled={busy || !ready} className="btn btn-primary w-full">
            {busy ? "Updating…" : ready ? "Update password" : "Waiting for reset link…"}
          </button>
        </form>
      </div>
    </div>
  );
}
