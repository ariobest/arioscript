import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SCRIPT_SELECT } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import { DynamicIcon } from "@/components/site/DynamicIcon";
import { formatDate, isOnline } from "@/lib/format";
import type { Script } from "@/lib/types";

export const Route = createFileRoute("/u/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();

  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });

  const badges = useQuery({
    queryKey: ["ubadges", profile.data?.id],
    enabled: !!profile.data?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_badges").select("badges(*)").eq("user_id", profile.data!.id);
      return (data ?? []).map((r) => r.badges).filter(Boolean);
    },
  });

  const favorites = useQuery({
    queryKey: ["userfavs", profile.data?.id],
    enabled: !!profile.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select(`scripts(${SCRIPT_SELECT})`)
        .eq("user_id", profile.data!.id);
      return (data ?? []).map((r) => r.scripts).filter(Boolean) as unknown as Script[];
    },
  });

  if (profile.isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading profile…</div>;
  if (!profile.data) return <div className="py-20 text-center text-sm text-muted-foreground">User not found.</div>;

  const p = profile.data;
  const online = isOnline(p.last_seen);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="glass flex flex-col items-center gap-4 rounded-2xl p-6 sm:flex-row sm:items-start">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
          {p.avatar_url ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" /> : p.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-display text-xl font-bold">{p.username}</h1>
            <span className={`chip ${online ? "text-[var(--success)]" : "text-muted-foreground"}`}>
              <Circle size={8} fill="currentColor" /> {online ? "Online" : "Offline"}
            </span>
            {p.is_banned && <span className="chip text-destructive">Banned</span>}
          </div>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
            <CalendarDays size={12} /> Joined {formatDate(p.created_at)}
          </p>
          {p.bio && <p className="mt-3 text-sm text-foreground/80">{p.bio}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {(badges.data ?? []).map((b) => (
              <span key={b!.id} className="chip" style={{ color: b!.color, borderColor: b!.color + "55" }} title={b!.description ?? ""}>
                <DynamicIcon name={b!.icon} size={11} /> {b!.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Favorite scripts</h2>
      <div className="mt-4">
        <ScriptGrid scripts={favorites.data ?? []} />
      </div>
    </div>
  );
}
