import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, ChevronDown, Check, Sparkles, Award, Crown, Shield, Star, Code2, Zap, Gem, Trophy, Flame, Heart, Rocket, Lock, Gift, Medal, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { CUSTOM_BADGE_ICONS, DynamicIcon } from "@/components/site/DynamicIcon";
import type { Badge } from "@/lib/types";

export const Route = createFileRoute("/admin/badges")({
  head: () => ({ meta: [{ title: 'Badges — ARIO SCRIPTS' }, { name: "description", content: 'Create and assign ARIO SCRIPTS member badges.' }, { property: "og:title", content: 'Badges — ARIO SCRIPTS' }, { property: "og:description", content: 'Create and assign ARIO SCRIPTS member badges.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminBadges,
});

const EMPTY: Partial<Badge> = { name: "", description: "", icon: "Award", color: "#3b82f6" };

function AdminBadges() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Badge> | null>(null);
  const [holdersOf, setHoldersOf] = useState<Badge | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [iconOpen, setIconOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  const lucideBadgeIcons = useMemo(() => [
    ["Award", Award], ["Crown", Crown], ["Shield", Shield], ["Star", Star], ["Code2", Code2],
    ["Zap", Zap], ["Gem", Gem], ["Trophy", Trophy], ["Flame", Flame], ["Heart", Heart],
    ["Rocket", Rocket], ["Lock", Lock], ["Gift", Gift], ["Medal", Medal], ["CircleCheck", CircleCheck],
    ["Sparkles", Sparkles],
  ] as const, []);
  const filteredLucideIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    return lucideBadgeIcons.filter(([name]) => !q || name.toLowerCase().includes(q));
  }, [iconSearch, lucideBadgeIcons]);

  const badges = useQuery({
    queryKey: ["badges"],
    queryFn: async () => ((await supabase.from("badges").select("*").order("name")).data ?? []) as Badge[],
  });

  const userBadges = useQuery({
    queryKey: ["all_user_badges"],
    queryFn: async () => (await supabase.from("user_badges").select("user_id, badge_id, profiles:user_id(username)")).data ?? [],
  });

  const people = useQuery({
    queryKey: ["people", userSearch],
    enabled: !!holdersOf,
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, username").order("username").limit(20);
      if (userSearch) q = q.ilike("username", `%${userSearch}%`);
      return (await q).data ?? [];
    },
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["badges"] });
    void qc.invalidateQueries({ queryKey: ["all_user_badges"] });
  }

  async function save() {
    if (!draft?.name) return toast.error("Badge name required");
    const payload = { name: draft.name, description: draft.description ?? null, icon: draft.icon || "Award", color: draft.color || "#3b82f6" };
    const res = draft.id
      ? await supabase.from("badges").update(payload).eq("id", draft.id)
      : await supabase.from("badges").insert(payload);
    if (res.error) return toast.error(res.error.message);
    if (user) await adminLog({ adminId: user.id, action: draft.id ? "edited badge" : "created badge", targetType: "badge", details: payload.name });
    toast.success("Badge saved");
    setDraft(null);
    refresh();
  }

  async function remove(b: Badge) {
    if (!confirm(`Delete badge "${b.name}"?`)) return;
    const { error } = await supabase.from("badges").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "deleted badge", targetType: "badge", details: b.name });
    refresh();
  }

  async function assign(badgeId: string, userId: string, has: boolean) {
    if (has) await supabase.from("user_badges").delete().eq("badge_id", badgeId).eq("user_id", userId);
    else {
      const { error } = await supabase.from("user_badges").insert({ badge_id: badgeId, user_id: userId, assigned_by: user?.id ?? null });
      if (error) return toast.error(error.message);
    }
    if (user) await adminLog({ adminId: user.id, action: has ? "removed badge" : "gave badge", targetType: "badge", targetId: badgeId });
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Badges</h1>
        <button onClick={() => setDraft({ ...EMPTY })} className="btn btn-primary ml-auto"><Plus size={15} /> Create badge</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(badges.data ?? []).map((b) => {
          const holders = (userBadges.data ?? []).filter((x) => x.badge_id === b.id);
          return (
            <div key={b.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: b.color + "22", color: b.color }}>
                  <DynamicIcon name={b.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold" style={{ color: b.color }}>{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.description}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{holders.length} holder{holders.length === 1 ? "" : "s"}</p>
              <div className="mt-3 flex gap-1.5">
                <button onClick={() => setHoldersOf(b)} className="btn btn-ghost !py-1 text-xs">Manage</button>
                <button onClick={() => setDraft(b)} className="btn btn-ghost !p-1.5"><Pencil size={13} /></button>
                <button onClick={() => void remove(b)} className="btn btn-ghost !p-1.5 text-destructive"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setDraft(null)}>
          <div className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <h2 className="font-display font-semibold">{draft.id ? "Edit badge" : "Create badge"}</h2>
              <button onClick={() => setDraft(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={14} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input className="input-base" placeholder="Badge name" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className="input-base" placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <div className="relative">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Badge icon</p>
                <button type="button" onClick={() => setIconOpen((v) => !v)} className="input-base flex w-full items-center gap-3 text-left">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><DynamicIcon name={draft.icon || "Award"} size={17} /></span>
                  <span className="flex-1 truncate text-sm">{draft.icon || "Award"}</span>
                  <ChevronDown size={15} className={"transition-transform " + (iconOpen ? "rotate-180" : "")} />
                </button>
                {iconOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} placeholder="Search Lucide icons…" className="input-base !pl-8" />
                    </div>
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">ARIO custom</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CUSTOM_BADGE_ICONS.map((name) => (
                        <button key={name} type="button" onClick={() => { setDraft({ ...draft, icon: name }); setIconOpen(false); }} className={"flex items-center gap-2 rounded-xl px-2 py-2 text-xs hover:bg-primary/10 " + (draft.icon === name ? "bg-primary/10 text-primary" : "")}>
                          <DynamicIcon name={name} size={16} /><span className="truncate">{name.replace("Ario", "")}</span>{draft.icon === name && <Check size={12} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lucide</p>
                    <div className="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto">
                      {filteredLucideIcons.map(([name]) => (
                        <button key={name} type="button" onClick={() => { setDraft({ ...draft, icon: name }); setIconOpen(false); }} className={"flex items-center gap-2 rounded-xl px-2 py-2 text-xs hover:bg-primary/10 " + (draft.icon === name ? "bg-primary/10 text-primary" : "")}>
                          <DynamicIcon name={name} size={16} /><span className="truncate">{name}</span>{draft.icon === name && <Check size={12} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={draft.color ?? "#3b82f6"} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="h-10 w-16 rounded-lg border border-border bg-transparent" />
                <span className="chip" style={{ color: draft.color, borderColor: (draft.color ?? "") + "55" }}>
                  <DynamicIcon name={draft.icon} size={11} /> {draft.name || "Preview"}
                </span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDraft(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => void save()} className="btn btn-primary">Save badge</button>
            </div>
          </div>
        </div>
      )}

      {holdersOf && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setHoldersOf(null)}>
          <div className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <h2 className="font-display font-semibold" style={{ color: holdersOf.color }}>{holdersOf.name}</h2>
              <button onClick={() => setHoldersOf(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={14} /></button>
            </div>
            <div className="relative mt-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users…" className="input-base !pl-9" />
            </div>
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {(people.data ?? []).map((p) => {
                const has = (userBadges.data ?? []).some((x) => x.badge_id === holdersOf.id && x.user_id === p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-secondary">
                    <span className="flex-1 truncate text-sm">{p.username}</span>
                    <button onClick={() => void assign(holdersOf.id, p.id, has)} className={`btn !py-1 text-xs ${has ? "btn-ghost text-destructive" : "btn-primary"}`}>
                      {has ? "Remove" : "Give"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
