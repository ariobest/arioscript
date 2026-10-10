import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KeyRound, Copy, Ban, Trash2, CalendarPlus, Download, Plus, Search, Gamepad2, History, ShieldCheck, Link2 } from "lucide-react";
import { KEY_GUIS, buildKeyGui, type KeyGuiId } from "@/lib/keyGuis";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { Button } from "@/components/ui/button";
import { keyStatus } from "./keys";

export const Route = createFileRoute("/admin/keys")({
  head: () => ({ meta: [{ title: "Keys — ARIO SCRIPTS Admin" }, { name: "description", content: "Generate, revoke and manage ARIO SCRIPTS keys." }, { property: "og:title", content: "Keys — ARIO SCRIPTS Admin" }, { property: "og:description", content: "Generate, revoke and manage ARIO SCRIPTS keys." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminKeys,
});

type K = { id: string; key: string; key_type: string; user_id: string | null; expires_at: string | null; max_uses: number | null; uses: number; active: boolean; notes: string | null; created_at: string; profiles?: { username: string } | null };
type Stats = Record<"total" | "active" | "expired" | "premium" | "lifetime" | "today" | "checks" | "failed", number>;

function AdminKeys() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState({ type: "free", count: 1, hours: 24, maxUses: "", notes: "", username: "" });
  const [historyOpen, setHistoryOpen] = useState(false);

  const settings = useQuery({ queryKey: ["key_settings_admin"], enabled: isAdmin, queryFn: async () => (await supabase.from("key_settings").select("*").eq("id", 1).single()).data });
  const stats = useQuery({ queryKey: ["key_stats"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.rpc("admin_key_stats"); if (error) throw error; return data as unknown as Stats; } });
  const history = useQuery({ queryKey: ["key_usage_history"], enabled: isAdmin && historyOpen, queryFn: async () => { const { data, error } = await supabase.from("key_checks").select("id, ok, created_at").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data ?? []; } });

  const list = useQuery({
    queryKey: ["admin_keys"], enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map(k => k.user_id).filter(Boolean))] as string[];
      const { data: ps } = ids.length ? await supabase.from("profiles").select("id,username").in("id", ids) : { data: [] };
      const names = new Map((ps ?? []).map(p => [p.id, p.username]));
      return (data ?? []).map(k => ({ ...k, profiles: k.user_id ? { username: names.get(k.user_id) ?? "?" } : null })) as K[];
    },
  });
  const refresh = () => { setSel(new Set()); void qc.invalidateQueries({ queryKey: ["admin_keys"] }); void qc.invalidateQueries({ queryKey: ["key_stats"] }); };

  const rows = useMemo(() => (list.data ?? []).filter(k =>
    (type === "all" || k.key_type === type) &&
    (status === "all" || keyStatus(k).toLowerCase() === status) &&
    (!q || `${k.key} ${k.notes ?? ""} ${k.profiles?.username ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [list.data, q, type, status]);

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Only administrators can manage keys.</p>;

  async function saveSettings(patch: Record<string, unknown>) {
    const { error } = await supabase.from("key_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Key settings saved");
    void qc.invalidateQueries({ queryKey: ["key_settings_admin"] });
  }

  async function generate() {
    let uid: string | null = null;
    if (gen.username.trim()) {
      const { data } = await supabase.from("profiles").select("id").eq("username", gen.username.trim()).maybeSingle();
      if (!data) return toast.error("No user with that username");
      uid = data.id;
    }
    const { data, error } = await supabase.rpc("admin_generate_keys", {
      _type: gen.type, _count: gen.count, _hours: gen.type === "lifetime" ? null as never : gen.hours,
      _max_uses: gen.maxUses ? Number(gen.maxUses) : null as never, _notes: gen.notes, _user: uid as never,
    });
    if (error) return toast.error(error.message);
    const keys = (data as K[]).map(k => k.key);
    if (keys.length === 1) await navigator.clipboard.writeText(keys[0]!).catch(() => {});
    toast.success(keys.length === 1 ? "Key generated and copied" : `${keys.length} keys generated`);
    await adminLog({ adminId: user!.id, action: `generated ${keys.length} ${gen.type} key(s)`, targetType: "license_key" });
    refresh();
  }

  async function bulk(action: "revoke" | "delete" | "extend", ids: string[]) {
    if (!ids.length) return;
    const label = action === "revoke" ? "revoke" : action === "delete" ? "permanently delete" : "extend by 7 days";
    if (action !== "extend" && !confirm(`Are you sure you want to ${label} ${ids.length} key(s)?`)) return;
    let error;
    if (action === "revoke") ({ error } = await supabase.from("license_keys").update({ active: false }).in("id", ids));
    else if (action === "delete") ({ error } = await supabase.from("license_keys").delete().in("id", ids));
    else {
      for (const k of (list.data ?? []).filter(k => ids.includes(k.id) && k.expires_at)) {
        const base = Math.max(Date.now(), new Date(k.expires_at!).getTime());
        ({ error } = await supabase.from("license_keys").update({ expires_at: new Date(base + 7 * 864e5).toISOString(), active: true }).eq("id", k.id));
        if (error) break;
      }
    }
    if (error) return toast.error(error.message);
    await adminLog({ adminId: user!.id, action: `${action} ${ids.length} key(s)`, targetType: "license_key" });
    toast.success("Done");
    refresh();
  }

  function exportCsv() {
    const list = rows.filter(r => !sel.size || sel.has(r.id));
    const csv = ["key,type,status,owner,expires,uses,max_uses,notes,created", ...list.map(k =>
      [k.key, k.key_type, keyStatus(k), k.profiles?.username ?? "", k.expires_at ?? "never", k.uses, k.max_uses ?? "", (k.notes ?? "").replace(/[,
]/g, " "), k.created_at].join(","))].join("
");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ario-keys.csv"; a.click();
  }

  const s = settings.data;
  const st = stats.data;
  const validateUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/keys/validate?key=`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><KeyRound className="text-primary" /> Keys</h1>
        {s && <Button variant={s.enabled ? "default" : "outline"} onClick={() => void saveSettings({ enabled: !s.enabled })}>Key system: {s.enabled ? "ON" : "OFF"}</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Total", st?.total], ["Active", st?.active], ["Expired", st?.expired], ["Premium", st?.premium], ["Lifetime", st?.lifetime], ["Generated today", st?.today], ["Key checks", st?.checks], ["Failed checks", st?.failed]] as const).map(([l, v]) =>
          <div key={l} className="glass admin-stat-tile rounded-xl p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-mono text-2xl font-semibold">{v ?? "—"}</p></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Generate keys</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select className="input-base" value={gen.type} onChange={e => setGen({ ...gen, type: e.target.value, hours: e.target.value === "premium" ? s?.premium_hours ?? 720 : s?.free_hours ?? 24 })}>
              <option value="free">Free</option><option value="premium">Premium</option><option value="lifetime">Lifetime</option>
            </select>
            <input className="input-base" type="number" min={1} max={500} value={gen.count} onChange={e => setGen({ ...gen, count: Math.min(500, Math.max(1, Number(e.target.value))) })} placeholder="How many" />
            <input className="input-base" type="number" min={1} disabled={gen.type === "lifetime"} value={gen.type === "lifetime" ? "" : gen.hours} onChange={e => setGen({ ...gen, hours: Number(e.target.value) })} placeholder={gen.type === "lifetime" ? "Never expires" : "Hours valid"} />
            <input className="input-base" type="number" min={1} value={gen.maxUses} onChange={e => setGen({ ...gen, maxUses: e.target.value })} placeholder="Max uses (blank = unlimited)" />
            <input className="input-base" value={gen.username} onChange={e => setGen({ ...gen, username: e.target.value })} placeholder="Assign to username (optional)" />
            <input className="input-base" value={gen.notes} onChange={e => setGen({ ...gen, notes: e.target.value })} placeholder="Notes" />
          </div>
          <Button className="mt-3 w-full" onClick={() => void generate()}><Plus size={16} /> Generate</Button>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Settings</h2>
          {s && <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <label>Wait (seconds)<input className="input-base mt-1" type="number" defaultValue={s.wait_seconds} onBlur={e => void saveSettings({ wait_seconds: Number(e.target.value) })} /></label>
            <label>Free key hours<input className="input-base mt-1" type="number" defaultValue={s.free_hours} onBlur={e => void saveSettings({ free_hours: Number(e.target.value) })} /></label>
            <label>Premium hours<input className="input-base mt-1" type="number" defaultValue={s.premium_hours} onBlur={e => void saveSettings({ premium_hours: Number(e.target.value) })} /></label><label>Max active / user<input className="input-base mt-1" type="number" min={1} max={10} defaultValue={s.max_active_keys ?? 1} onBlur={e => void saveSettings({ max_active_keys: Math.min(10, Math.max(1, Number(e.target.value))) })} /></label>
          </div>}
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(validateUrl).then(() => toast.success("Validation URL copied"))}><Link2 size={14}/> Copy validation URL</Button><Button size="sm" variant="outline" onClick={() => setHistoryOpen(v => !v)}><History size={14}/> {historyOpen ? "Hide" : "View"} usage history</Button></div><p className="mt-4 text-xs text-muted-foreground">Check a key from your Lua script:</p>
          <code className="mt-1 block break-all rounded-lg bg-background/50 p-2 font-mono text-xs">{`local ok = game:HttpGet("${validateUrl}" .. key)`}</code>
          {historyOpen && <div className="mt-3 rounded-xl border border-border/60 bg-background/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Recent validation checks</span><span className="text-[10px] text-muted-foreground">Last 100</span></div><div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-auto sm:grid-cols-4">{(history.data ?? []).map(h => <div key={h.id} className="rounded-lg border border-border/50 p-2 text-[10px]"><span className={h.ok ? "text-emerald-400" : "text-destructive"}>{h.ok ? "VALID" : "FAILED"}</span><span className="ml-2 text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span></div>)}</div>{!history.isLoading && !(history.data ?? []).length && <p className="text-xs text-muted-foreground">No validation checks yet.</p>}</div>}
        </div>
      </div>

      {st && <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm"><span className="font-semibold">Key check success rate</span><span className="font-mono">{st.checks ? Math.round(((st.checks - st.failed) / st.checks) * 100) : 0}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${st.checks ? ((st.checks - st.failed) / st.checks) * 100 : 0}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{st.checks - st.failed} accepted · {st.failed} refused</p>
      </div>}

      <LoaderBuilder />

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="input-base !pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Search key, owner, notes" /></div>
          <select className="input-base !w-auto" value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option><option value="free">Free</option><option value="premium">Premium</option><option value="lifetime">Lifetime</option></select>
          <select className="input-base !w-auto" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="used up">Used up</option></select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => void bulk("revoke", [...sel])}><Ban size={14} /> Revoke ({sel.size})</Button>
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => void bulk("extend", [...sel])}><CalendarPlus size={14} /> +7 days</Button>
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => void bulk("delete", [...sel])}><Trash2 size={14} /> Delete</Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download size={14} /> Export</Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="p-2"><input type="checkbox" checked={!!rows.length && rows.every(r => sel.has(r.id))} onChange={e => setSel(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
              <th className="p-2">Key</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Owner</th><th className="p-2">Expires</th><th className="p-2">Uses</th><th className="p-2">Created</th><th className="p-2" />
            </tr></thead>
            <tbody>{rows.map(k => <tr key={k.id} className="border-t border-border">
              <td className="p-2"><input type="checkbox" checked={sel.has(k.id)} onChange={e => { const n = new Set(sel); if (e.target.checked) n.add(k.id); else n.delete(k.id); setSel(n); }} /></td>
              <td className="p-2 font-mono text-xs" title={k.notes ?? ""}>{k.key}</td>
              <td className="p-2 capitalize">{k.key_type}</td>
              <td className="p-2">{keyStatus(k)}</td>
              <td className="p-2">{k.profiles?.username ?? "—"}</td>
              <td className="p-2 text-xs">{k.expires_at ? new Date(k.expires_at).toLocaleString() : "Never"}</td>
              <td className="p-2">{k.uses}{k.max_uses ? `/${k.max_uses}` : ""}</td>
              <td className="p-2 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
              <td className="p-2"><div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => void navigator.clipboard.writeText(k.key).then(() => toast.success("Copied"))}><Copy size={14} /></Button>
                <Button size="icon" variant="ghost" aria-label="Revoke" onClick={() => void bulk("revoke", [k.id])}><Ban size={14} /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => void bulk("delete", [k.id])}><Trash2 size={14} /></Button>
              </div></td>
            </tr>)}</tbody>
          </table>
          {!rows.length && <p className="p-4 text-center text-sm text-muted-foreground">{list.isLoading ? "Loading…" : "No keys found."}</p>}
        </div>
      </div>
    </div>
  );
}

function LoaderBuilder() {
  const [style, setStyle] = useState<KeyGuiId>("aurora");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("ARIO HUB");
  const [accent, setAccent] = useState("#3b82f6");
  const [validatorUrl, setValidatorUrl] = useState("");
  const [getKeyUrl, setGetKeyUrl] = useState("");
  const [terminalMessage, setTerminalMessage] = useState("Initializing secure link...");
  const [validatorStatus, setValidatorStatus] = useState("");
  const [checkingValidator, setCheckingValidator] = useState(false);
  const raws = useQuery({ queryKey: ["raw_scripts_pick"], queryFn: async () => (await supabase.from("raw_scripts").select("name,slug").eq("enabled", true).order("name")).data ?? [] });
  const origin = typeof window !== "undefined" ? (window.location.hostname.includes("id-preview--") || window.location.hostname === "localhost" ? "https://arioscript.lovable.app" : window.location.origin) : "";
  const effectiveValidator = validatorUrl.trim() || `${origin}/api/public/keys/validate?key=`;
  const effectiveGetKey = getKeyUrl.trim() || `${origin}/keys`;
  const code = buildKeyGui({ style, origin, scriptUrl: `${origin}/raw/${slug || "YOUR_SCRIPT_SLUG"}`, title: title || "ARIO HUB", accent, validatorUrl: effectiveValidator, getKeyUrl: effectiveGetKey, terminalMessage });
  async function testValidator() {
    setCheckingValidator(true); setValidatorStatus("");
    try {
      const testUrl = effectiveValidator.includes("{key}") ? effectiveValidator.replaceAll("{key}", "ARIO-TEST-KEY") : effectiveValidator.includes("key=") ? effectiveValidator + "ARIO-TEST-KEY" : effectiveValidator;
      const response = await fetch(testUrl, { method: "GET", headers: { Accept: "application/json, text/plain" } });
      const body = (await response.text()).slice(0, 180);
      setValidatorStatus(`HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`);
    } catch (error) {
      setValidatorStatus(`Could not read validator from this browser. It may be offline or block cross-origin (CORS) requests. ${error instanceof Error ? error.message : ""}`);
    } finally { setCheckingValidator(false); }
  }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = `ario-key-${style}.lua`; a.click();
  }
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Gamepad2 size={16} className="text-primary" /> Roblox key menus</h2>
      <p className="mt-1 text-xs text-muted-foreground">Pick a style and script. Players get a Get Key button, the key is checked with your site, then your script runs.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {KEY_GUIS.map(g => <button key={g.id} onClick={() => setStyle(g.id)} className={`rounded-xl border p-3 text-left transition-colors ${style === g.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
          <p className="text-sm font-semibold">{g.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{g.desc}</p>
        </button>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Custom validator URL <input className="input-base mt-1" value={validatorUrl} onChange={e => setValidatorUrl(e.target.value)} placeholder={`${origin}/api/public/keys/validate?key=`} /></label>
        <label className="text-xs text-muted-foreground">Custom Get Key website <input className="input-base mt-1" value={getKeyUrl} onChange={e => setGetKeyUrl(e.target.value)} placeholder={`${origin}/keys`} /></label>
        {style === "terminal" && <label className="text-xs text-muted-foreground sm:col-span-2">Terminal startup message <input className="input-base mt-1" maxLength={180} value={terminalMessage} onChange={e => setTerminalMessage(e.target.value)} /></label>}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><Button variant="outline" onClick={() => void testValidator()} disabled={checkingValidator}><ShieldCheck size={14}/>{checkingValidator ? "Testing…" : "Test validator website"}</Button><span className="text-xs text-muted-foreground">Uses a dummy test key; it does not validate or consume a real key.</span></div>
        {validatorStatus && <p className="min-w-0 break-all whitespace-pre-wrap rounded-lg border border-border/50 bg-background/30 p-3 text-xs sm:col-span-2">{validatorStatus}</p>}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select className="input-base" value={slug} onChange={e => setSlug(e.target.value)}>
          <option value="">Choose raw script…</option>
          {raws.data?.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
        </select>
        <input className="input-base" value={title} onChange={e => setTitle(e.target.value.slice(0, 40))} placeholder="Menu title" />
        <input type="color" className="h-10 w-full rounded-lg border border-border bg-transparent sm:w-14" value={accent} onChange={e => setAccent(e.target.value)} aria-label="Accent colour" />
      </div>
      <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-background/50 p-3 font-mono text-[11px] leading-relaxed">{code}</pre>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => void navigator.clipboard.writeText(code).then(() => toast.success("Loader copied"))}><Copy size={14} /> Copy code</Button>
        <Button variant="outline" onClick={download}><Download size={14} /> .lua file</Button>
      </div>
    </div>
  );
}
