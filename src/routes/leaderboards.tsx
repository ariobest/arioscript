import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Eye, Download, Copy, Heart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listScripts } from "@/lib/queries";
import { compact } from "@/lib/format";
import type { Script } from "@/lib/types";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: [
      { title: "Leaderboards — ARIO SCRIPTS" },
      { name: "description", content: "The most viewed, downloaded, copied and favorited scripts plus our most active members." },
      { property: "og:title", content: "Leaderboards — ARIO SCRIPTS" },
      { property: "og:description", content: "The most viewed, downloaded, copied and favorited scripts plus our most active members." },
    ],
  }),
  component: Leaderboards,
});

function Board({ title, icon: Icon, scripts, metric }: { title: string; icon: React.ElementType; scripts: Script[]; metric: keyof Script }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-primary" />
        <h2 className="font-display font-semibold">{title}</h2>
      </div>
      <ol className="space-y-1.5">
        {scripts.map((s, i) => (
          <li key={s.id}>
            <Link to="/scripts/$slug" params={{ slug: s.slug }} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary">
              <span className="w-5 text-center font-display text-sm font-bold text-primary">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
              <span className="text-xs text-muted-foreground">{compact(s[metric] as number)}</span>
            </Link>
          </li>
        ))}
        {!scripts.length && <p className="px-2 text-sm text-muted-foreground">Nothing here yet.</p>}
      </ol>
    </div>
  );
}

function Leaderboards() {
  const views = useQuery({ queryKey: ["lb", "views"], queryFn: () => listScripts({ sort: "views", limit: 10 }) });
  const downloads = useQuery({ queryKey: ["lb", "downloads"], queryFn: () => listScripts({ sort: "downloads", limit: 10 }) });
  const copies = useQuery({ queryKey: ["lb", "copies"], queryFn: () => listScripts({ sort: "copies", limit: 10 }) });
  const favorites = useQuery({ queryKey: ["lb", "favorites"], queryFn: () => listScripts({ sort: "favorites", limit: 10 }) });

  const users = useQuery({
    queryKey: ["lb", "users"],
    queryFn: async () => {
      const { data: favs } = await supabase.from("favorites").select("user_id");
      const counts = new Map<string, number>();
      for (const f of favs ?? []) counts.set(f.user_id, (counts.get(f.user_id) ?? 0) + 1);
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!top.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", top.map(([id]) => id));
      return top.map(([id, count]) => ({
        count,
        profile: profiles?.find((p) => p.id === id),
      })).filter((r) => r.profile);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-primary" />
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Leaderboards</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Live rankings built from real activity.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Board title="Most viewed" icon={Eye} scripts={(views.data ?? []) as Script[]} metric="views" />
        <Board title="Most downloaded" icon={Download} scripts={(downloads.data ?? []) as Script[]} metric="downloads" />
        <Board title="Most copied" icon={Copy} scripts={(copies.data ?? []) as Script[]} metric="copies" />
        <Board title="Most favorited" icon={Heart} scripts={(favorites.data ?? []) as Script[]} metric="favorites" />

        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <h2 className="font-display font-semibold">Popular users</h2>
          </div>
          <ol className="space-y-1.5">
            {(users.data ?? []).map((u, i) => (
              <li key={u.profile!.id}>
                <Link to="/u/$username" params={{ username: u.profile!.username }} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary">
                  <span className="w-5 text-center font-display text-sm font-bold text-primary">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{u.profile!.username}</span>
                  <span className="text-xs text-muted-foreground">{u.count} favs</span>
                </Link>
              </li>
            ))}
            {!(users.data ?? []).length && <p className="px-2 text-sm text-muted-foreground">Nothing here yet.</p>}
          </ol>
        </div>
      </div>
    </div>
  );
}
