import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { listScripts } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import type { Script } from "@/lib/types";

export const Route = createFileRoute("/games/$game")({
  component: GamePage,
});

function GamePage() {
  const { game } = Route.useParams();
  const scripts = useQuery({ queryKey: ["game", game], queryFn: () => listScripts({ game, limit: 60 }) });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/games" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> All games
      </Link>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{game}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{scripts.data?.length ?? 0} scripts</p>
      <div className="mt-6">
        <ScriptGrid scripts={(scripts.data ?? []) as Script[]} />
      </div>
    </div>
  );
}
