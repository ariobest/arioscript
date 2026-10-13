import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ShieldCheck, Plus, Copy, Trash2, Eye, EyeOff, Clock3, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/protector")({
  head: () => ({ meta: [{ title: "ARIO API Manager — ARIO ADMIN" }] }),
  component: ScriptProtector,
});

type ProtectedScript = {
  id: string; name: string; enabled: boolean; expires_at: string | null;
  created_at: string; last_accessed_at: string | null;
};

const ARIO_API_URL = "https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api";

async function requestApi(_path: string, init: RequestInit = {}) {
  // First use the current session; if it is missing/stale, ask Supabase to refresh it.
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }
  if (!session?.access_token) {
    throw new Error("Your login session is missing or expired. Sign in again, then reopen API Manager.");
  }

  const send = (token: string) => fetch(ARIO_API_URL, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  let response = await send(session.access_token);
  // A page can retain an old access token while refresh is pending. Refresh once on 401.
  if (response.status === 401) {
    const refreshed = await supabase.auth.refreshSession();
    const freshToken = refreshed.data.session?.access_token;
    if (freshToken && freshToken !== session.access_token) {
      response = await send(freshToken);
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = [payload.error, payload.detail]
      .filter((part) => typeof part === "string" && part.trim())
      .join(": ");
    if (response.status === 401) {
      throw new Error(message || "Supabase rejected your login session. Sign in again.");
    }
    throw new Error(message || `Request failed (${response.status})`);
  }
  return payload;
}

function ScriptProtector() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const sourceFileRef = useRef<HTMLInputElement>(null);
  const [selectedLuaFile, setSelectedLuaFile] = useState("");
  const [sourceMode, setSourceMode] = useState<"paste" | "raw">("paste");
  const [rawUrl, setRawUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLoader, setNewLoader] = useState("");
  const [loadstringUrl, setLoadstringUrl] = useState("");
  const [loadstringError, setLoadstringError] = useState("");
  const list = useQuery({
    queryKey: ["protected-scripts"],
    enabled: isStaff,
    queryFn: async () => (await requestApi("/api/protector")).scripts as ProtectedScript[],
    retry: false,
  });

  async function create() {
    if (!name.trim() || (sourceMode === "paste" ? !source.trim() : !rawUrl.trim())) return toast.error("Add a name and Lua source or raw link first.");
    setBusy(true);
    try {
      const result = await requestApi("/api/protector", {
        method: "POST",
        body: JSON.stringify({ name, ...(sourceMode === "raw" ? { rawUrl } : { source }), expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
      });
      const upstreamLoader = new URL(result.loaderUrl);
      const websiteLoader = new URL("/raw/api-loader", window.location.origin);
      websiteLoader.search = upstreamLoader.search;
      setNewLoader(websiteLoader.toString());
      setLoadstringUrl(websiteLoader.toString());
      setLoadstringError("");
      setName(""); setSource(""); setRawUrl(""); setExpiresAt(""); setSelectedLuaFile("");
      await qc.invalidateQueries({ queryKey: ["protected-scripts"] });
      toast.success("API loader created. Save the link now; its token is only shown once.");
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
      toast.success("API script deleted");
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
        <div><h1 className="font-display text-2xl font-bold">ARIO API Manager</h1><p className="text-sm text-muted-foreground">Private source storage · token-gated delivery · revocable loaders</p></div>
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
        <div className="flex items-center gap-2"><Plus size={18} className="text-primary"/><h2 className="font-display text-lg font-semibold">Create an API loader</h2></div>
        <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Script name</span><input className="input-base" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ARIO MM2 V2"/></label>
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Source type</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={sourceMode === "paste" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setSourceMode("paste")}>Paste Lua</button>
            <button type="button" className={sourceMode === "raw" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setSourceMode("raw")}>Import raw link</button>
          </div>
        </div>
        {sourceMode === "paste" ? (
          <div className="space-y-2"><label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Lua source (max 1 MB)</span><textarea className="input-base w-full font-mono text-xs" rows={10} spellCheck={false} value={source} onChange={e => setSource(e.target.value)} placeholder="Paste your Lua script here…"/></label><input ref={sourceFileRef} type="file" accept=".lua,text/plain" className="hidden" onChange={async e => { const input=e.currentTarget; const file=input.files?.[0]; if(!file)return; if(!file.name.toLowerCase().endsWith(".lua")){toast.error("Choose a .lua file");input.value="";return;} if(file.size>1024*1024){toast.error("Lua files must be 1 MB or smaller");input.value="";return;} try { const text=await file.text(); if(!text.trim()){toast.error("That Lua file is empty");return;} setSource(text); setSelectedLuaFile(file.name); if(!name.trim())setName(file.name.replace(/\.lua$/i,"")); toast.success("Lua source loaded into API Manager"); } catch { toast.error("Could not read that Lua file"); } finally {input.value="";} }} /><div className="flex flex-wrap items-center gap-2"><button type="button" className="btn btn-ghost h-10 !px-3 text-xs" onClick={()=>sourceFileRef.current?.click()}><Plus size={14}/> Upload .lua file</button>{selectedLuaFile && <span className="max-w-full truncate text-xs text-muted-foreground">Loaded: {selectedLuaFile}</span>}</div></div>
        ) : (
          <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Public HTTPS raw script URL</span><input className="input-base w-full font-mono text-xs" type="url" inputMode="url" value={rawUrl} onChange={e => setRawUrl(e.target.value)} placeholder="https://raw.githubusercontent.com/user/repo/main/script.lua"/><span className="text-xs text-muted-foreground">ARIO fetches the raw text on the server and stores a protected snapshot. Supported: GitHub Raw, GitHub Gist, Pastebin /raw, paste.rs, Rentry, and your ARIO site. The source will not auto-sync when the original file changes.</span></label>
        )}
        <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Optional expiry</span><input className="input-base" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}/><span className="text-xs text-muted-foreground">Leave blank for no expiry.</span></label>
        <button disabled={busy} onClick={() => void create()} className="btn btn-primary w-full sm:w-auto">{busy ? "Creating…" : "Create API loader"}</button>
      </section>

      <section className="glass space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><Copy size={18} className="text-primary"/><h2 className="font-display text-lg font-semibold">Loadstring Maker</h2></div>
        <p className="text-sm text-muted-foreground">Paste a protected ARIO website loader URL or the Supabase ario-api loader URL. The maker converts Supabase loader links to your ARIO website endpoint and never embeds the Lua source in the URL.</p>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Protected loader URL</span>
          <textarea className="input-base w-full break-all font-mono text-xs" rows={3} value={loadstringUrl} onChange={e => { setLoadstringUrl(e.target.value); setLoadstringError(""); }} placeholder="https://arioscript.lovable.app/raw/api-loader?id=...&token=..."/>
        </label>
        {(() => {
          let output = "";
          let error = loadstringError;
          if (loadstringUrl.trim()) {
            try {
              const inputUrl = new URL(loadstringUrl.trim());
              if (inputUrl.protocol !== "https:" || inputUrl.username || inputUrl.password) {
                throw new Error("Use a valid HTTPS loader URL.");
              }
              const isSupabaseLoader = inputUrl.hostname === "yxbzblbtzqioexszjjkc.supabase.co" && inputUrl.pathname === "/functions/v1/ario-api";
              const isWebsiteLoader = inputUrl.hostname === "arioscript.lovable.app" && inputUrl.pathname === "/raw/api-loader";
              if (!isSupabaseLoader && !isWebsiteLoader) {
                throw new Error("Use an ARIO /raw/api-loader URL or the ARIO Supabase ario-api loader URL.");
              }
              const websiteUrl = new URL("https://arioscript.lovable.app/raw/api-loader");
              websiteUrl.search = inputUrl.search;
              if (!websiteUrl.searchParams.get("id") || !websiteUrl.searchParams.get("token")) {
                throw new Error("Loader URL must include both id and token. Create a protected loader above first.");
              }
              output = `loadstring(game:HttpGet(${JSON.stringify(websiteUrl.toString())}, true))()`;
            } catch (e) {
              error = e instanceof Error ? e.message : "Invalid loader URL.";
            }
          }
          return <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Generated loadstring</span>
              <textarea readOnly rows={3} className="input-base w-full break-all font-mono text-xs" value={output} placeholder="Your loadstring will appear here after you enter a valid protected loader URL."/>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!output} onClick={() => void copy(output)}><Copy size={14}/> Copy Loadstring</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setLoadstringUrl(newLoader); setLoadstringError(""); }} disabled={!newLoader}>Use latest created loader</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setLoadstringUrl(""); setLoadstringError(""); }}>Clear</button>
            </div>
          </>;
        })()}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-primary"/><h2 className="font-display text-lg font-semibold">API scripts</h2><button aria-label="Refresh" className="btn btn-ghost ml-auto !p-2" onClick={() => void list.refetch()}><RefreshCw size={15}/></button></div>
        {list.isLoading && <p className="text-sm text-muted-foreground">Loading API scripts…</p>}
        {list.error && <div className="glass rounded-xl border border-destructive/30 p-4 text-sm"><p className="font-semibold text-destructive">ARIO API unavailable</p><p className="mt-1 break-words text-muted-foreground">{list.error instanceof Error ? list.error.message : "Unknown error"}. Check that the ario-api Edge Function is deployed and has access to the protected_scripts table. Never put the service-role key in browser code.</p></div>}
        {(list.data ?? []).map(item => <div key={item.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>{item.enabled ? <Eye size={17}/> : <EyeOff size={17}/>}</div>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">Created {new Date(item.created_at).toLocaleDateString()} · {item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleString()}` : "No expiry"}</p><p className="text-xs text-muted-foreground">{item.last_accessed_at ? `Last request: ${new Date(item.last_accessed_at).toLocaleString()}` : "Never requested"}</p></div>
          <button className="btn btn-ghost h-10 !px-3 text-xs" onClick={() => void setEnabled(item)}>{item.enabled ? <><EyeOff size={14}/> Disable</> : <><Eye size={14}/> Enable</>}</button>
          <button aria-label={`Delete ${item.name}`} className="btn btn-ghost h-10 !px-3 text-xs text-destructive" onClick={() => void remove(item)}><Trash2 size={14}/> Delete</button>
        </div>)}
        {list.data && !list.data.length && <div className="glass rounded-2xl p-7 text-center text-sm text-muted-foreground">No API scripts yet. Create your first loader above.</div>}
      </section>
    </div>
  );
}
