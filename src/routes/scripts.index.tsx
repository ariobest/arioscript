import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { getCategories, listScripts } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import type { Script } from "@/lib/types";

type SearchParams = {
  q?: string;
  sort?: string;
  category?: string;
  game?: string;
  featured?: boolean;
  working?: boolean;
};

export const Route = createFileRoute("/scripts/")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s['q'] === "string" ? s['q'] : undefined,
    sort: typeof s['sort'] === "string" ? s['sort'] : undefined,
    category: typeof s['category'] === "string" ? s['category'] : undefined,
    game: typeof s['game'] === "string" ? s['game'] : undefined,
    featured: s['featured'] === true || s['featured'] === "true" ? true : undefined,
    working: s['working'] === true || s['working'] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse Scripts — ARIO SCRIPTS" },
      { name: "description", content: "Search and filter the full ARIO SCRIPTS library by game, category, tag and popularity." },
      { property: "og:title", content: "Browse Scripts — ARIO SCRIPTS" },
      { property: "og:description", content: "Search and filter the full ARIO SCRIPTS library by game, category, tag and popularity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Browse,
});

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "views", label: "Most viewed" },
  { key: "downloads", label: "Most downloaded" },
  { key: "copies", label: "Most copied" },
  { key: "favorites", label: "Most favorited" },
];

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/scripts/" });
  const [term, setTerm] = useState(search.q ?? "");

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const scripts = useQuery({
    queryKey: ["browse", search],
    queryFn: () =>
      listScripts({
        q: search.q,
        sort: search.sort,
        category: search.category,
        game: search.game,
        featured: search.featured,
        workingOnly: search.working,
        limit: 60,
      }),
  });

  function update(patch: Partial<SearchParams>) {
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Browse scripts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {scripts.data?.length ?? 0} script{(scripts.data?.length ?? 0) === 1 ? "" : "s"} found
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: term || undefined });
        }}
        className="relative mt-6"
      >
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search name, game, description or tag..."
          className="input-base !rounded-2xl !py-3.5 !pl-11"
        />
      </form>

      <div className="glass mt-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <SlidersHorizontal size={15} className="text-primary" />
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => update({ sort: s.key })}
            className={`chip transition-colors ${(search.sort ?? "newest") === s.key ? "!border-primary text-primary" : "text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={() => update({ featured: search.featured ? undefined : true })}
          className={`chip ${search.featured ? "!border-primary text-primary" : "text-muted-foreground"}`}
        >
          Featured
        </button>
        <button
          onClick={() => update({ working: search.working ? undefined : true })}
          className={`chip ${search.working ? "!border-primary text-primary" : "text-muted-foreground"}`}
        >
          Working
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={() => update({ category: undefined })}
          className={`chip ${!search.category ? "!border-primary text-primary" : "text-muted-foreground"}`}
        >
          All categories
        </button>
        {(categories.data ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => update({ category: c.slug })}
            className={`chip ${search.category === c.slug ? "!border-primary text-primary" : "text-muted-foreground"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {scripts.isLoading ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading scripts…</div>
        ) : (
          <ScriptGrid scripts={(scripts.data ?? []) as Script[]} />
        )}
      </div>
    </div>
  );
}
