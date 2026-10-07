import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search, Shuffle, Sparkles, Flame, Clock, Download, Eye, Copy, Gamepad2, LayoutGrid,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCategories, getGames, getTrending, listScripts } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import { DynamicIcon } from "@/components/site/DynamicIcon";
import type { Script } from "@/lib/types";
import { useSettings } from "@/components/site/Layout";
import { SITE_BRAND, siteTitle } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: siteTitle() },
      { name: "description", content: SITE_BRAND.description },
      { property: "og:title", content: siteTitle() },
      { property: "og:description", content: SITE_BRAND.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Section({ title, icon: Icon, to, children }: { title: string; icon: React.ElementType; to?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon size={16} />
        </span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {to && (
          <Link to={to} className="ml-auto text-xs text-muted-foreground transition-colors hover:text-primary">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: settings } = useSettings();
  const sections = Array.isArray(settings?.homepage_sections) ? settings.homepage_sections : ["featured", "trending", "recent", "downloads", "views", "copies", "games", "categories"];

  const featured = useQuery({ queryKey: ["s", "featured"], queryFn: () => listScripts({ featured: true, limit: 8 }) });
  const trending = useQuery({ queryKey: ["s", "trending"], queryFn: () => getTrending(8) });
  const recent = useQuery({ queryKey: ["s", "newest"], queryFn: () => listScripts({ sort: "newest", limit: 8 }) });
  const downloaded = useQuery({ queryKey: ["s", "downloads"], queryFn: () => listScripts({ sort: "downloads", limit: 4 }) });
  const viewed = useQuery({ queryKey: ["s", "views"], queryFn: () => listScripts({ sort: "views", limit: 4 }) });
  const copied = useQuery({ queryKey: ["s", "copies"], queryFn: () => listScripts({ sort: "copies", limit: 4 }) });
  const games = useQuery({ queryKey: ["games"], queryFn: getGames });
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }).limit(3);
       const now = Date.now();
       return (data ?? []).filter(a => (!a.start_at || new Date(a.start_at).getTime() <= now) && (!a.end_at || new Date(a.end_at).getTime() >= now));
    },
  });

  async function randomScript() {
    const { data } = await supabase.from("scripts").select("slug").eq("published", true).eq("archived", false).limit(200);
    if (!data?.length) return;
    const pick = data[Math.floor(Math.random() * data.length)];
    navigate({ to: "/scripts/$slug", params: { slug: pick.slug } });
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/scripts", search: { q: q || undefined } as never });
  }



  return (
    <div className="pb-10">
      {/* HERO */}
       <section className="mx-auto max-w-7xl px-4 pt-9 sm:pt-20" style={settings?.hero_image_url ? { backgroundImage: `linear-gradient(to bottom, transparent, var(--background)), url("${settings.hero_image_url.replace(/["\\]/g, "")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <div className="fade-up mx-auto max-w-3xl text-center">
          <span className="chip mx-auto text-primary">
            <Sparkles size={12} /> Premium script library
          </span>
          <h1 className="hero-title mt-6 font-display font-black tracking-tight">
            <span className="hero-kicker">THE SCRIPT LIBRARY</span>
            <span className="hero-title-text hero-title-main" data-text={settings?.site_name ?? SITE_BRAND.name}>{settings?.site_name ?? SITE_BRAND.name}</span>
            <span className="hero-title-sub">Premium Lua scripts. <span>Fast to find.</span> Easy to use.</span>
          </h1>
          <div className="hero-title-line mx-auto mt-4" aria-hidden />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            {settings?.description ?? SITE_BRAND.description}
          </p>

          <form onSubmit={search} className="relative mx-auto mt-8 grid max-w-xl grid-cols-[minmax(0,1fr)_auto] gap-2 sm:block">
            <Search size={18} className="absolute left-4 top-1/2 hidden -translate-y-1/2 text-muted-foreground sm:block" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by script, game, category or tag..."
              className="input-base min-w-0 !py-3 !pl-3 text-sm sm:!rounded-2xl sm:!py-4 sm:!pl-12 sm:!pr-28 sm:text-base"
            />
            <button type="submit" className="btn btn-primary shrink-0 sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2">
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => void randomScript()} className="btn btn-ghost">
              <Shuffle size={15} /> Random script
            </button>
            <Link to="/scripts" search={{ sort: "views" } as never} className="btn btn-ghost">
              <Flame size={15} /> Popular now
            </Link>
          </div>
        </div>

        {announcements.data?.length ? (
          <div className="mx-auto mt-10 grid max-w-4xl gap-3">
            {announcements.data.map((a) => (
              <div key={a.id} className="glass flex gap-3 rounded-2xl p-4">
                 <DynamicIcon name={a.icon} size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                   {a.link_url && /^https?:\/\//.test(a.link_url) && <a href={a.link_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary">Learn more →</a>}
                </div>
              </div>
            ))}
          </div>
        ) : null}

      </section>

       {sections.includes("featured") && <Section title="Featured Scripts" icon={Sparkles} to="/scripts">
        <ScriptGrid scripts={(featured.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("trending") && <Section title="Trending This Week" icon={Flame} to="/scripts">
        <ScriptGrid scripts={(trending.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("recent") && <Section title="Recently Added" icon={Clock} to="/scripts">
        <ScriptGrid scripts={(recent.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("downloads") && <Section title="Most Downloaded" icon={Download} to="/scripts">
        <ScriptGrid scripts={(downloaded.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("views") && <Section title="Most Viewed" icon={Eye} to="/scripts">
        <ScriptGrid scripts={(viewed.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("copies") && <Section title="Most Copied" icon={Copy} to="/scripts">
        <ScriptGrid scripts={(copied.data ?? []) as Script[]} />
       </Section>}

       {sections.includes("games") && <Section title="Popular Games" icon={Gamepad2} to="/games">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(games.data ?? []).slice(0, 12).map((g) => (
            <Link
              key={g.game}
              to="/games/$game"
              params={{ game: g.game }}
              className="glass card-hover rounded-2xl p-4 text-center"
            >
              <Gamepad2 size={18} className="mx-auto text-primary" />
              <p className="mt-2 truncate text-sm font-semibold">{g.game}</p>
              <p className="text-xs text-muted-foreground">{g.count} scripts</p>
            </Link>
          ))}
        </div>
       </Section>}

       {sections.includes("categories") && <Section title="Categories" icon={LayoutGrid} to="/categories">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(categories.data ?? []).map((c) => (
            <Link
              key={c.id}
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="glass card-hover flex items-center gap-3 rounded-2xl p-4"
            >
               <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-primary/15 text-primary">
                 {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <DynamicIcon name={c.icon} size={16} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
       </Section>}
    </div>
  );
}
