import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Eye } from "lucide-react";
import { getGames } from "@/lib/queries";
import { compact } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { DataErrorState } from "@/components/site/ScriptCard";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Games Directory — ARIO SCRIPTS" },
      { name: "description", content: "Every game covered by the ARIO SCRIPTS library and how many scripts each one has." },
      { property: "og:title", content: "Games Directory — ARIO SCRIPTS" },
      { property: "og:description", content: "Every game covered by the ARIO SCRIPTS library and how many scripts each one has." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Games,
});

function Games() {
  const games = useQuery({ queryKey: ["games"], queryFn: getGames });

  return (
    <div className="ario-page ario-games-page mx-auto max-w-7xl px-4 py-10">
      <div className="ario-page-header"><span className="ario-page-kicker">LIBRARY / GAMES</span><h1 className="font-display text-2xl font-bold sm:text-3xl">Games</h1><p className="mt-2 text-sm text-muted-foreground">{games.data?.length ?? 0} games in the library</p></div>

      {games.isError ? <DataErrorState title="Games couldn’t load" /> : games.isLoading ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Loading games">{Array.from({ length: 8 }, (_, i) => <div key={i} className="glass overflow-hidden rounded-2xl"><Skeleton className="aspect-[16/9] w-full rounded-none" /><div className="space-y-3 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div> : <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(games.data ?? []).map((g) => (
          <Link key={g.game} to="/games/$game" params={{ game: g.game }} className="glass card-hover overflow-hidden rounded-2xl">
            <div className="aspect-[16/9] bg-secondary">
              {g.image ? (
                <img src={g.image} alt={g.game} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center"><Gamepad2 className="text-primary/70" size={28} /></div>
              )}
            </div>
            <div className="p-4">
              <p className="truncate font-semibold">{g.game}</p>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{g.count} scripts</span>
                <span className="flex items-center gap-1"><Eye size={11} />{compact(g.views)}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>}
    </div>
  );
}
