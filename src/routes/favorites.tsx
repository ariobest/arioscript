import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SCRIPT_SELECT } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import type { Script } from "@/lib/types";

export const Route = createFileRoute("/favorites")({
  component: Favorites,
});

function Favorites() {
  const { user, loading } = useAuth();

  const favs = useQuery({
    queryKey: ["myfavs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select(`script_id, scripts(${SCRIPT_SELECT})`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((r) => r.scripts).filter(Boolean) as unknown as Script[];
    },
  });

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Heart size={26} className="mx-auto text-primary" />
        <h1 className="mt-3 font-display text-xl font-semibold">Your favorites live here</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to save scripts and find them instantly.</p>
        <Link to="/auth" className="btn btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">My favorites</h1>
      <p className="mt-1 text-sm text-muted-foreground">{favs.data?.length ?? 0} saved scripts</p>
      <div className="mt-6">
        <ScriptGrid scripts={favs.data ?? []} />
      </div>
    </div>
  );
}
