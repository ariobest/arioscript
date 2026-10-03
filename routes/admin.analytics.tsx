import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getGames, listScripts } from "@/lib/queries";
import { useTimeseries } from "./admin.index";
import { compact } from "@/lib/format";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: 'Analytics — ARIO SCRIPTS' }, { name: "description", content: 'Review real script and member activity over time.' }, { property: "og:title", content: 'Analytics — ARIO SCRIPTS' }, { property: "og:description", content: 'Review real script and member activity over time.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Analytics,
});

const RANGES = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 3650 },
];

function Analytics() {
  const [days, setDays] = useState(30);
  const ts = useTimeseries(days);
  const popular = useQuery({ queryKey: ["an", "popular"], queryFn: () => listScripts({ sort: "views", limit: 8 }) });
  const games = useQuery({ queryKey: ["games"], queryFn: getGames });
  const cats = useQuery({
    queryKey: ["an", "cats"],
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("views, categories(name)").eq("published", true);
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const name = (r as { categories?: { name?: string } }).categories?.name ?? "Uncategorised";
        map.set(name, (map.get(name) ?? 0) + (r.views ?? 0));
      }
      return Array.from(map, ([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views);
    },
  });

  const tooltip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)} className={`chip ${days === r.days ? "!border-primary text-primary" : "text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-display font-semibold">Events over time</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ts.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltip} />
              <Line dataKey="views" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line dataKey="downloads" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line dataKey="copies" stroke="var(--success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 font-display font-semibold">New users & scripts</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ts.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="new_users" fill="var(--primary)" radius={4} />
                <Bar dataKey="new_scripts" fill="var(--accent)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-display font-semibold">Popular scripts</h2>
          <ul className="space-y-1.5 text-sm">
            {(popular.data ?? []).map((s) => (
              <li key={s.id} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-secondary">
                <span className="truncate">{s.name}</span>
                <span className="text-muted-foreground">{compact(s.views)} views</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-display font-semibold">Popular games</h2>
          <ul className="space-y-1.5 text-sm">
            {(games.data ?? []).slice(0, 8).map((g) => (
              <li key={g.game} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-secondary">
                <span className="truncate">{g.game}</span>
                <span className="text-muted-foreground">{compact(g.views)} views</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-display font-semibold">Popular categories</h2>
          <ul className="space-y-1.5 text-sm">
            {(cats.data ?? []).map((c) => (
              <li key={c.name} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-secondary">
                <span className="truncate">{c.name}</span>
                <span className="text-muted-foreground">{compact(c.views)} views</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
