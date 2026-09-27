import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { listScripts } from "@/lib/queries";
import { ScriptGrid } from "@/components/site/ScriptCard";
import type { Script } from "@/lib/types";

export const Route = createFileRoute("/categories/$slug")({
  head: () => ({ meta: [{ title: 'Category Scripts — ARIO SCRIPTS' }, { name: "description", content: 'Browse Lua scripts in an ARIO SCRIPTS category.' }, { property: "og:title", content: 'Category Scripts — ARIO SCRIPTS' }, { property: "og:description", content: 'Browse Lua scripts in an ARIO SCRIPTS category.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const scripts = useQuery({ queryKey: ["cat", slug], queryFn: () => listScripts({ category: slug, limit: 60 }) });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/categories" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> All categories
      </Link>
      <h1 className="font-display text-2xl font-bold capitalize sm:text-3xl">{slug.replace(/-/g, " ")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{scripts.data?.length ?? 0} scripts</p>
      <div className="mt-6">
        <ScriptGrid scripts={(scripts.data ?? []) as Script[]} />
      </div>
    </div>
  );
}
