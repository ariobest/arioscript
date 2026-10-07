import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, Code2, Heart, KeyRound, User, ArrowUpRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { compact, timeAgo } from "@/lib/format";

export const Route=createFileRoute("/dashboard")({component:Dashboard});

function Dashboard(){
 const {user,profile,loading}=useAuth();
 const sb=supabase as any;
 const favs=useQuery({queryKey:["dashboard-favs",user?.id],enabled:!!user,queryFn:async()=>{const {data,error}=await sb.from("favorites").select("script_id,created_at,scripts(name,slug,game_name,image_url)").eq("user_id",user!.id).order("created_at",{ascending:false}).limit(6);if(error)throw error;return data??[];}});
 const events=useQuery({queryKey:["dashboard-events",user?.id],enabled:!!user,queryFn:async()=>{const {data,error}=await sb.from("activity_events").select("*").eq("user_id",user!.id).order("created_at",{ascending:false}).limit(8);if(error)throw error;return data??[];}});
 const keys=useQuery({queryKey:["dashboard-keys",user?.id],enabled:!!user,queryFn:async()=>{const {data,error}=await sb.from("license_keys").select("id,key,key_type,active,expires_at").eq("user_id",user!.id).order("created_at",{ascending:false}).limit(3);if(error)throw error;return data??[];}});
 if(loading)return <div className="py-24 text-center text-sm text-muted-foreground">Loading dashboard…</div>;
 if(!user)return <div className="mx-auto max-w-md px-4 py-24 text-center"><User size={30} className="mx-auto text-primary"/><h1 className="mt-4 text-2xl font-bold">Your ARIO dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to manage favorites, keys, activity and developer tools.</p><Link to="/auth" className="btn btn-primary mt-6">Sign in</Link></div>;
 const cards=[{label:"Favorites",value:favs.data?.length??0,icon:Heart,to:"/favorites"},{label:"Active keys",value:keys.data?.filter((k:any)=>k.active).length??0,icon:KeyRound,to:"/keys"},{label:"Activity",value:events.data?.length??0,icon:Activity,to:"/notifications"},{label:"API",value:"Developer",icon:Code2,to:"/api-docs"}];
 return <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
  <div className="glass overflow-hidden rounded-3xl p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><span className="chip text-primary">Personal command center</span><h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">Welcome back, {profile?.username??"Developer"}.</h1><p className="mt-2 text-sm text-muted-foreground">Everything you use on ARIO, in one place.</p></div><Link to="/u/$username" params={{username:profile?.username??""}} className="btn btn-ghost"><User size={15}/> View profile <ArrowUpRight size={14}/></Link></div></div>
  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(c=><Link key={c.label} to={c.to as any} className="glass card-hover rounded-2xl p-4"><c.icon size={18} className="text-primary"/><p className="mt-4 font-display text-xl font-bold">{c.value}</p><p className="text-xs text-muted-foreground">{c.label}</p></Link>)}</div>
  <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
   <section className="glass rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-display font-semibold">Saved scripts</h2><Link to="/favorites" className="text-xs text-primary">View all →</Link></div><div className="mt-4 space-y-2">{(favs.data??[]).map((f:any)=><Link key={f.script_id} to="/scripts/$slug" params={{slug:f.scripts?.slug}} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-secondary/50"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Code2 size={16}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{f.scripts?.name}</p><p className="text-xs text-muted-foreground">{f.scripts?.game_name}</p></div><ArrowUpRight size={14} className="text-muted-foreground"/></Link>)}{!favs.data?.length&&<p className="py-8 text-center text-sm text-muted-foreground">No favorites yet.</p>}</div></section>
   <section className="glass rounded-2xl p-5"><h2 className="font-display font-semibold">Recent activity</h2><div className="mt-4 space-y-3">{(events.data??[]).map((e:any)=><div key={e.id} className="flex gap-3"><span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Activity size={13}/></span><div><p className="text-sm font-medium capitalize">{String(e.event_type).replace(/_/g," ")}</p><p className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</p></div></div>)}{!events.data?.length&&<p className="py-8 text-center text-sm text-muted-foreground">Your activity will appear here.</p>}</div></section>
  </div>
 </div>
}