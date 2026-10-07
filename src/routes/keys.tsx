import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyRound, Copy, Clock, ShieldCheck, Crown, Infinity as InfinityIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/keys")({
  head: () => ({ meta: [{ title: "Get Key — ARIO SCRIPTS" }, { name: "description", content: "Get your free ARIO SCRIPTS key and see your active keys." }, { property: "og:title", content: "Get Key — ARIO SCRIPTS" }, { property: "og:description", content: "Get your free ARIO SCRIPTS key and see your active keys." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: KeysPage,
});

type MyKey = { id: string; key: string; key_type: string; expires_at: string | null; active: boolean; uses: number; max_uses: number | null };

export const keyStatus = (k: { active: boolean; expires_at: string | null; uses?: number; max_uses?: number | null }) =>
  !k.active ? "Revoked" : k.expires_at && new Date(k.expires_at) <= new Date() ? "Expired" : k.max_uses && (k.uses ?? 0) >= k.max_uses ? "Used up" : "Active";

const TypeIcon = ({ t }: { t: string }) => t === "lifetime" ? <InfinityIcon size={14} /> : t === "premium" ? <Crown size={14} /> : <KeyRound size={14} />;

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success("Key copied"); } catch { toast.error("Could not copy"); }
}

function KeysPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const settings = useQuery({
    queryKey: ["key_settings"],
    queryFn: async () => (await supabase.from("key_settings").select("enabled,wait_seconds").limit(1).maybeSingle()).data,
  });
  const mine = useQuery({
    queryKey: ["my_keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("license_keys").select("id,key,key_type,expires_at,active,uses,max_uses").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as MyKey[];
    },
  });

  const enabled = settings.data?.enabled !== false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="glass fade-up rounded-2xl p-6 text-center sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><KeyRound size={22} /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Get your key</h1>
        {!enabled ? (
          <p className="mt-2 text-sm text-muted-foreground">The key system is temporarily unavailable. Please check back soon.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Free keys take {settings.data?.wait_seconds ?? 20} seconds to prepare and work in ARIO scripts until they expire.</p>
            <div className="mt-6">
              {loading ? null : user ? (
                <Button onClick={() => setOpen(true)}><KeyRound size={16} /> Get free key</Button>
              ) : (
                <Link to="/auth" className="btn btn-primary">Sign in to get a key</Link>
              )}
            </div>
          </>
        )}
      </div>

      {user && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold">Your keys</h2>
          {mine.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : !mine.data?.length ? <p className="text-sm text-muted-foreground">You don't have any keys yet.</p>
            : <div className="space-y-2">{mine.data.map(k => {
              const st = keyStatus(k);
              return <div key={k.id} className="glass flex flex-wrap items-center gap-3 rounded-xl p-3">
                <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold capitalize text-primary"><TypeIcon t={k.key_type} />{k.key_type}</span>
                <code className="min-w-0 flex-1 truncate font-mono text-sm">{k.key}</code>
                <span className={`text-xs ${st === "Active" ? "text-primary" : "text-muted-foreground"}`}>{st}</span>
                <span className="text-xs text-muted-foreground">{k.expires_at ? `Expires ${new Date(k.expires_at).toLocaleString()}` : "Never expires"}</span>
                <Button size="sm" variant="outline" onClick={() => void copy(k.key)}><Copy size={14} /> Copy</Button>
              </div>;
            })}</div>}
        </section>
      )}

      {open && <KeyModal onClose={() => { setOpen(false); void qc.invalidateQueries({ queryKey: ["my_keys"] }); }} />}
    </div>
  );
}

function KeyModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"starting" | "waiting" | "claiming" | "done" | "error">("starting");
  const [total, setTotal] = useState(20);
  const [left, setLeft] = useState(20);
  const [result, setResult] = useState<{ key: string; key_type: string; expires_at: string | null } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const { data, error } = await supabase.rpc("start_key_request");
      if (error) { setErr(error.message); setPhase("error"); return; }
      const secs = Number(data ?? 20);
      setTotal(secs); setLeft(secs); setPhase("waiting");
      const end = Date.now() + secs * 1000 + 600;
      timer = setInterval(() => {
        const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        setLeft(l);
        if (l === 0) { clearInterval(timer); void claim(); }
      }, 250);
    })();
    return () => { if (timer) clearInterval(timer); };
  }, []);

  async function claim() {
    setPhase("claiming");
    const { data, error } = await supabase.rpc("claim_free_key");
    if (error) { setErr(error.message); setPhase("error"); return; }
    setResult(data as never); setPhase("done");
    toast.success("Key generated");
  }

  const pct = total ? ((total - left) / total) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-background/70 p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-md rounded-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{phase === "done" ? "Key generated" : "Preparing your key"}</h2>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X size={18} /></Button>
        </div>
        {(phase === "starting" || phase === "waiting" || phase === "claiming") && <>
          <p className="mt-2 text-sm text-muted-foreground">Your key is being prepared… keep this window open. The wait is checked on our side, so it can't be skipped.</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} /></div>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold">
            {phase === "claiming" ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Clock size={15} /> {left}s</>}
          </p>
        </>}
        {phase === "done" && result && <>
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-4 text-center">
            <code className="break-all font-mono text-base font-semibold">{result.key}</code>
          </div>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> Active · {result.expires_at ? `expires ${new Date(result.expires_at).toLocaleString()}` : "never expires"}</p>
          <Button className="mt-4 w-full" onClick={() => void copy(result.key)}><Copy size={16} /> Copy key</Button>
        </>}
        {phase === "error" && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </div>
    </div>
  );
}
