import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Plus, Copy, Trash2, Eye, EyeOff, Clock3, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/protector")({
  head: () => ({ meta: [{ title: "Script Protector — ARIO ADMIN" }] }),
  component: ScriptProtector,
});

type ProtectedScript = {
  id: string; name: string; enabled: boolean; expires_at: string | null;
  created_at: string; last_accessed_at: string | null;
};

async function requestApi(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again.");
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function ScriptProtector() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLoader, setNewLoader] = useState("");
  const list = useQuery({
    queryKey: ["protected-scripts"],
    enabled: isStaff,
    queryFn: async () => (await requestApi("/api/protector")).scripts as ProtectedScript[],
    retry: false,
  });

  async function create() {
    if (!name.trim() || !source.trim()) return toast.error("Add a name and Lua source first.");
    setBusy(true);
    try {
      const result = await requestApi("/api/protector", {
        method: "POST",
        body: JSON.stringify({ name, source, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
      });
      setNewLoader(result.loaderUrl);
      setName(""); setSource(""); setExpiresAt("");
      await qc.invalidateQueries({ queryKey: ["protected-scripts"] });
      toast.success("Protected loader created. Save the link now; the token is only shown once.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create protected loader");
    } finally { setBusy(false); }
  }

  async function setEnabled(item: ProtectedScript) {
    try {
      await requestApi("/api/protector", { method: "PATCH", body: JSON.stringify({ id: item.id, enabled: !item.enabled }) });
      await qc.invalidateQueries({ queryKey: ["protected-scripts"] });
      toast.success(item.enabled ? "Loader disabled" : "Loader enabled");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Update failed"); }
  }

  async function remove(item: ProtectedScript) {
    if (!confirm(`Permanently delete "${item.name}" and revoke its loader?`)) return;
    try {
      await requestApi("/api/protector", { method: "DELETE", body: JSON.stringify({ id: item.id }) });
      await qc.invalidateQueries({ queryKey: ["protected-scripts"] });
      toast.success("Protected script deleted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Delete failed"); }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); }
    catch { toast.error("Clipboard unavailable on this device"); }
  }

  if (!isStaff) return <p className="text-sm text-muted-foreground">Staff access required.</p>;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck size={22}/></div>
        <div><h1 className="font-display text-2xl font-bold">Script Protector</h1><p className="text-sm text-muted-foreground">Private source storage · token-gated delivery · revocable loaders</p></div>
      </div>

      <div className="glass flex gap-3 rounded-2xl border border-amber-400/25 p-4 text-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18}/>
        <p className="text-muted-foreground">The raw URL returns no source without its secret token. Anyone who receives a valid loader can still capture the returned Lua; this is access control, not unbreakable DRM. Keep valuable logic server-side where possible.</p>
      </div>

      {newLoader && <div className="glass space-y-3 rounded-2xl border border-primary/30 p-4">
        <p className="font-semibold text-primary">Your new loader URL — copy and save it now</p>
        <textarea readOnly rows={3} className="input-base w-full break-all font-mono text-xs" value={newLoader}/>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => void copy(newLoader)}><Copy size={14}/> Copy URL</button>
          <button className="btn btn-ghost" onClick={() => void copy(`loadstring(game:HttpGet(${JSON.stringify(newLoader)}, true))()`)}><Copy size={14}/> Copy loadstring</button>
          <button className="btn btn-ghost" onClick={() => setNewLoader("")}>Dismiss</button>
        </div>
      </div>}

      <section className="glass space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><Plus size={18} className="text-primary"/><h2 className="font-display text-lg font-semibold">Protect a Lua script</h2></div>
        <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Script name</span><input className="input-base" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ARIO MM2 V2"/></label>
        <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Lua source (max 1 MB)</span><textarea className="input-base w-full font-mono text-xs" rows={10} spellCheck={false} value={source} onChange={e => setSource(e.target.value)} placeholder="Paste your Lua script here…"/></label>
        <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Optional expiry</span><input className="input-base" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}/><span className="text-xs text-muted-foreground">Leave blank for no expiry.</span></label>
        <button disabled={busy} onClick={() => void create()} className="btn btn-primary w-full sm:w-auto">{busy ? "Protecting…" : "Protect script & generate loader"}</button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-primary"/><h2 className="font-display text-lg font-semibold">Protected scripts</h2><button aria-label="Refresh" className="btn btn-ghost ml-auto !p-2" onClick={() => void list.refetch()}><RefreshCw size={15}/></button></div>
        {list.isLoading && <p className="text-sm text-muted-foreground">Loading protected scripts…</p>}
        {list.error && <div className="glass rounded-xl border border-destructive/30 p-4 text-sm"><p className="font-semibold text-destructive">Protector API unavailable</p><p className="mt-1 break-words text-muted-foreground">{list.error instanceof Error ? list.error.message : "Unknown error"}. Ensure SUPABASE_SERVICE_ROLE_KEY is configured only as a server-side environment variable and apply the protector SQL migration.</p></div>}
        {(list.data ?? []).map(item => <div key={item.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>{item.enabled ? <Eye size={17}/> : <EyeOff size={17}/>}</div>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">Created {new Date(item.created_at).toLocaleDateString()} · {item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleString()}` : "No expiry"}</p><p className="text-xs text-muted-foreground">{item.last_accessed_at ? `Last request: ${new Date(item.last_accessed_at).toLocaleString()}` : "Never requested"}</p></div>
          <button className="btn btn-ghost h-10 !px-3 text-xs" onClick={() => void setEnabled(item)}>{item.enabled ? <><EyeOff size={14}/> Disable</> : <><Eye size={14}/> Enable</>}</button>
          <button aria-label={`Delete ${item.name}`} className="btn btn-ghost h-10 !px-3 text-xs text-destructive" onClick={() => void remove(item)}><Trash2 size={14}/> Delete</button>
        </div>)}
        {list.data && !list.data.length && <div className="glass rounded-2xl p-7 text-center text-sm text-muted-foreground">No protected scripts yet. Add your first script above.</div>}
      </section>
    </div>
  );
}
