import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Terminal, Eye, Download, Copy, Heart, Flag, Wifi, Activity,
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

function Tile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon size={15} className="text-primary" />
      <p className="mt-2 font-display text-xl font-bold">{compact(value ?? 0)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Dashboard() {
  const stats = useAdminStats();
  const ts = useTimeseries(30);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live numbers straight from the database.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile icon={Users} label="Total users" value={s['users']} />
        <Tile icon={Wifi} label="Online now" value={s['online']} />
        <Tile icon={Terminal} label="Scripts" value={s['scripts']} />
        <Tile icon={Eye} label="Views" value={s['views']} />
        <Tile icon={Download} label="Downloads" value={s['downloads']} />
        <Tile icon={Copy} label="Copies" value={s['copies']} />
        <Tile icon={Heart} label="Favorites" value={s['favorites']} />
        <Tile icon={Flag} label="Open reports" value={s['reports']} />
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display font-semibold">Last 30 days</h2>
        <div className="h-64">
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

      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={15} className="text-primary" />
          <h2 className="font-display font-semibold">Recent admin activity</h2>
          <Link to="/admin/logs" className="ml-auto text-xs text-muted-foreground hover:text-primary">All logs →</Link>
        </div>
        <ul className="space-y-1.5 text-sm">
          {(activity.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary">
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
