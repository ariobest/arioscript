import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KeyRound, Copy, Ban, Trash2, CalendarPlus, Download, Plus, Search } from "lucide-react";
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

  const settings = useQuery({ queryKey: ["key_settings_admin"], enabled: isAdmin, queryFn: async () => (await supabase.from("key_settings").select("*").eq("id", 1).single()).data });
  const stats = useQuery({ queryKey: ["key_stats"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.rpc("admin_key_stats"); if (error) throw error; return data as unknown as Stats; } });
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
      [k.key, k.key_type, keyStatus(k), k.profiles?.username ?? "", k.expires_at ?? "never", k.uses, k.max_uses ?? "", (k.notes ?? "").replace(/[,\n]/g, " "), k.created_at].join(","))].join("\n");
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
            <label>Premium hours<input className="input-base mt-1" type="number" defaultValue={s.premium_hours} onBlur={e => void saveSettings({ premium_hours: Number(e.target.value) })} /></label>
          </div>}
          <p className="mt-4 text-xs text-muted-foreground">Check a key from your Lua script:</p>
          <code className="mt-1 block break-all rounded-lg bg-background/50 p-2 font-mono text-xs">{`local ok = game:HttpGet("${validateUrl}" .. key):find('"valid":true')`}</code>
        </div>
      </div>

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
