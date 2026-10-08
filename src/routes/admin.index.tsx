import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Terminal, Eye, Download, Copy, Heart, Flag, Wifi, Activity, KeyRound, Plus, Bot, Palette, Settings, Megaphone, ShieldCheck, Zap, Trophy, Code2, RefreshCw, Clock, ArrowUpRight, Server, Gauge, CircleDot,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { compact, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: 'Admin Dashboard — ARIO SCRIPTS' }, { name: "description", content: 'View live ARIO SCRIPTS activity and statistics.' }, { property: "og:title", content: 'Admin Dashboard — ARIO SCRIPTS' }, { property: "og:description", content: 'View live ARIO SCRIPTS activity and statistics.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

type Stats = Record<string, number>;

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
    refetchInterval: 30_000,
  });
}

export function useTimeseries(days: number) {
  return useQuery({
    queryKey: ["admin_ts", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_timeseries", { _days: days });
      if (error) throw error;
      return (data ?? []) as { day: string; views: number; copies: number; downloads: number; new_users: number; new_scripts: number }[];
    },
  });
}

function Tile({ icon: Icon, label, value, pending }: { icon: React.ElementType; label: string; value?: number; pending?: boolean }) {
  return (
    <div className="glass admin-stat-tile group relative min-w-0 overflow-hidden rounded-2xl border border-border/60 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_40px_-20px_hsl(var(--primary)/.45)] sm:p-4">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" /><div className="relative grid h-9 w-9 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><Icon size={15} /></div>
      <p className="mt-3 truncate font-display text-xl font-bold">{pending ? "—" : compact(value ?? 0)}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [endpoint, setEndpoint] = useState("/api/v1/scripts");
  const [apiResult, setApiResult] = useState("Ready");
  const [apiBusy, setApiBusy] = useState(false);
  const stats = useAdminStats();
  const ts = useTimeseries(range);

  const activity = useQuery({
    queryKey: ["recent_activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_logs")
        .select("*, profiles:admin_id(username)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const s = stats.data ?? {};
  const ov = useQuery({
    queryKey: ["admin_overview"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const o = ov.data;
  const refreshing = stats.isFetching || ts.isFetching || ov.isFetching || activity.isFetching;
  const security = useQuery({ queryKey: ["admin_security_snapshot"], refetchInterval: 30_000, queryFn: async () => {
    const [failed, users] = await Promise.all([
      supabase.from("key_checks").select("id, ok, created_at").eq("ok", false).order("created_at", { ascending: false }).limit(8),
      supabase.from("profiles").select("id, username, is_banned, is_disabled, last_seen").or("is_banned.eq.true,is_disabled.eq.true").limit(8),
    ]);
    return { failed: failed.data ?? [], users: users.data ?? [] };
  }});
  const lastUpdated = Math.max(stats.dataUpdatedAt, ts.dataUpdatedAt, ov.dataUpdatedAt, activity.dataUpdatedAt);

  async function refreshDashboard() {
    await queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
    await queryClient.invalidateQueries({ queryKey: ["admin_ts"] });
    await queryClient.invalidateQueries({ queryKey: ["admin_overview"] });
    await queryClient.invalidateQueries({ queryKey: ["recent_activity"] });
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="glass relative overflow-hidden rounded-3xl border border-border/70 p-5 shadow-[0_18px_60px_-35px_hsl(var(--primary)/.5)] sm:p-6">
        <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/.18)]"><Activity size={16} /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-bold tracking-tight">Admin Dashboard</h1><span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Control</span></div>
                <p className="mt-0.5 text-sm text-muted-foreground">Live operational overview from your database.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/30 px-2.5 py-1">
                <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "animate-pulse bg-primary" : "bg-success"}`} />
                {refreshing ? "Updating data…" : "Live"}
              </span>
              {lastUpdated > 0 && <span className="inline-flex items-center gap-1"><Clock size={11} /> Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
          <button type="button" onClick={refreshDashboard} disabled={refreshing} className="btn btn-ghost inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/30 sm:w-auto">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </div>

        {stats.isError && <p className="text-sm text-destructive">Statistics could not be loaded. Please try again.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile icon={Users} label="Total users" value={s['users']} pending={!stats.data} />
        <Tile icon={Wifi} label="Online now" value={s['online']} pending={!stats.data} />
        <Tile icon={Terminal} label="Scripts" value={s['scripts']} pending={!stats.data} />
        <Tile icon={Eye} label="Views" value={s['views']} pending={!stats.data} />
        <Tile icon={Download} label="Downloads" value={s['downloads']} pending={!stats.data} />
        <Tile icon={Copy} label="Copies" value={s['copies']} pending={!stats.data} />
        <Tile icon={Heart} label="Favorites" value={s['favorites']} pending={!stats.data} />
        <Tile icon={Flag} label="Open reports" value={s['reports']} pending={!stats.data} />
      </div>

      <div className="glass rounded-3xl border border-border/60 p-3 shadow-[0_16px_50px_-35px_hsl(var(--primary)/.4)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Admin controls</p>
            <p className="text-xs text-muted-foreground">Jump directly into management tools.</p>
          </div>
          <Gauge size={16} className="text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} className="glass admin-stat-tile group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 p-3 text-center text-xs font-semibold transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/[.04] hover:text-primary">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110"><q.icon size={17} /></span>{q.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-border/60 p-4 sm:p-5">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-destructive/10 text-destructive"><ShieldCheck size={15}/></span><div><h2 className="font-display font-semibold">Security Center</h2><p className="text-[11px] text-muted-foreground">Recent failed validations and restricted accounts.</p></div><Link to="/admin/logs" className="ml-auto text-xs text-primary">Logs →</Link></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background/30 p-3"><p className="font-mono text-xl font-bold text-destructive">{security.data?.failed.length ?? "—"}</p><p className="text-[11px] text-muted-foreground">Recent failed checks</p></div>
            <div className="rounded-xl border border-border bg-background/30 p-3"><p className="font-mono text-xl font-bold">{security.data?.users.length ?? "—"}</p><p className="text-[11px] text-muted-foreground">Restricted users</p></div>
          </div>
          <div className="mt-3 space-y-1.5">{(security.data?.failed ?? []).slice(0,4).map(x => <div key={x.id} className="flex items-center justify-between rounded-lg bg-destructive/5 px-3 py-2 text-xs"><span className="text-destructive">Failed validation</span><span className="text-muted-foreground">{timeAgo(x.created_at)}</span></div>)}{!(security.data?.failed.length) && <p className="text-xs text-muted-foreground">No recent failed validations.</p>}</div>
          <div className="mt-3 flex gap-2"><Link to="/admin/logs" className="btn btn-ghost flex-1">Admin activity</Link><Link to="/admin/users" className="btn btn-primary flex-1">Manage users</Link></div>
        </div>
        <div className="glass rounded-2xl border border-border/60 p-4 sm:p-5">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Code2 size={15}/></span><div><h2 className="font-display font-semibold">Developer Tools</h2><p className="text-[11px] text-muted-foreground">Test public endpoints without exposing secrets.</p></div><Link to="/admin/studio" className="ml-auto text-xs text-primary">Studio →</Link></div>
          <div className="mt-4 flex gap-2"><input className="input-base min-w-0 flex-1" value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="/api/v1/scripts"/><button className="btn btn-primary" disabled={apiBusy} onClick={async()=>{setApiBusy(true);setApiResult("Testing…");try{const url=new URL(endpoint,window.location.origin);const t=performance.now();const res=await fetch(url);const body=await res.text();setApiResult(`${res.status} • ${Math.round(performance.now()-t)}ms • ${body.slice(0,180)}`)}catch(e){setApiResult(e instanceof Error?e.message:"Request failed")}finally{setApiBusy(false)}}}>{apiBusy?"…":"Test"}</button></div>
          <div className="mt-3 rounded-xl border border-border bg-background/30 p-3 font-mono text-[10px] leading-5 text-muted-foreground">{apiResult}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link to="/api-docs" className="btn btn-ghost">API Docs</Link><Link to="/admin/settings" className="btn btn-ghost">Config status</Link></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-border/60 p-4 shadow-[0_12px_40px_-30px_hsl(var(--primary)/.35)] sm:p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={15} /></span><div><h2 className="font-display font-semibold">System status</h2><p className="text-[11px] text-muted-foreground">Core services at a glance</p></div><span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success"><CircleDot size={10} /> MONITORING</span></div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Status label="Key system" ok={!!o?.key_system} on="Online" off="Off" />
            <Status label="Maintenance" ok={!o?.maintenance} on="Site live" off="Maintenance on" />
            <Status label="Registration" ok={!!o?.registration} on="Open" off="Closed" />
            <Status label="Raw loaders" ok={(o?.raw_enabled ?? 0) > 0} on={`${o?.raw_enabled ?? 0}/${o?.raw_total ?? 0} enabled`} off={`${o?.raw_enabled ?? 0}/${o?.raw_total ?? 0} enabled`} />
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini icon={KeyRound} label="Active keys" v={o?.keys_active} />
            <Mini icon={Zap} label="Keys today" v={o?.keys_today} />
            <Mini icon={Activity} label="Checks today" v={o?.key_checks_today} />
            <Mini icon={Terminal} label="Drafts" v={o?.drafts} />
            <Mini icon={Megaphone} label="Live notices" v={o?.announcements} />
            <Mini icon={Users} label="Banned" v={o?.banned} />
          </div>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Trophy size={15} /></span><div><h2 className="font-display font-semibold">Top scripts</h2><p className="text-[11px] text-muted-foreground">Highest activity right now</p></div><ArrowUpRight size={15} className="ml-auto text-muted-foreground" /></div>
          <ol className="space-y-1.5 text-sm">
            {(o?.top_scripts ?? []).map((t, i) => (
              <li key={t.id} className="group grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-transparent px-2 py-2.5 transition-all hover:border-border hover:bg-secondary/70">
                <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                <Link to="/scripts/$slug" params={{ slug: t.slug }} className="truncate font-medium hover:text-primary">{t.name}</Link>
                <span className="flex gap-2 font-mono text-xs text-muted-foreground"><span className="flex items-center gap-0.5"><Eye size={11} />{compact(t.views)}</span><span className="flex items-center gap-0.5"><Copy size={11} />{compact(t.copies)}</span></span>
              </li>
            ))}
            {o && !o.top_scripts.length && <p className="text-sm text-muted-foreground">No scripts yet.</p>}
            {!o && <p className="text-sm text-muted-foreground">{ov.isError ? "Could not load." : "Loading…"}</p>}
          </ol>
        </div>
      </div>

      <div className="glass min-w-0 overflow-hidden rounded-3xl border border-border/60 p-3 shadow-[0_18px_60px_-35px_hsl(var(--primary)/.45)] sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="hidden" />
          <div>
            <h2 className="font-display font-semibold">Traffic overview</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Views, downloads and copies over the selected period.</p>
          </div>
          <div className="flex rounded-xl border border-border bg-background/30 p-1">
            {[7, 30, 90].map((days) => (
              <button key={days} type="button" onClick={() => setRange(days as 7 | 30 | 90)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${range === days ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {days}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-56 min-w-0 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ts.data ?? []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="views" stroke="var(--primary)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="downloads" stroke="var(--accent)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="copies" stroke="var(--success)" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={15} className="text-primary" />
          <h2 className="font-display font-semibold">Recent admin activity</h2>
          <Link to="/admin/logs" className="ml-auto text-xs text-muted-foreground hover:text-primary">All logs →</Link>
        </div>
        <ul className="space-y-1.5 text-sm">
          {(activity.data ?? []).map((a) => (
            <li key={a.id} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-all hover:border-border hover:bg-secondary/60"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Server size={12} /></span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-primary">{(a as { profiles?: { username?: string } }).profiles?.username ?? "admin"}</span>{" "}
                {a.action} {a.details ? `· ${a.details}` : ""}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
            </li>
          ))}
          {!(activity.data ?? []).length && <p className="text-sm text-muted-foreground">No admin activity yet.</p>}
        </ul>
      </div>
    </div>
  );
}

type Overview = {
  keys_active: number; keys_today: number; key_checks_today: number; key_system: boolean;
  raw_total: number; raw_enabled: number; drafts: number; archived: number; banned: number;
  announcements: number; maintenance: boolean; registration: boolean;
  top_scripts: { id: string; name: string; slug: string; views: number; copies: number; downloads: number }[];
};

const QUICK = [
  { to: "/admin/scripts", label: "New script", icon: Plus },
  { to: "/admin/keys", label: "Keys", icon: KeyRound },
  { to: "/admin/raw", label: "Raw loader", icon: Terminal },
  { to: "/admin/assistant", label: "Assistant", icon: Bot },
  { to: "/admin/themes", label: "Themes", icon: Palette },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function Status({ label, ok, on, off }: { label: string; ok: boolean; on: string; off: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-success" : "text-destructive"}`}>
        <span className={`h-2 w-2 animate-pulse rounded-full ${ok ? "bg-success" : "bg-destructive"}`} />{ok ? on : off}
      </span>
    </li>
  );
}

function Mini({ icon: Icon, label, v }: { icon: React.ElementType; label: string; v?: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/30 p-2.5">
      <Icon size={13} className="text-primary" />
      <p className="mt-1 font-mono text-lg font-semibold">{v ?? "—"}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
