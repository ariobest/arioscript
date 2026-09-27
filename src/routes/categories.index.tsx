import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/lib/queries";
import { DynamicIcon } from "@/components/site/DynamicIcon";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Script Categories — ARIO SCRIPTS" },
      { name: "description", content: "Combat, automation, ESP, farming, teleport, utilities, UI and more script categories." },
      { property: "og:title", content: "Script Categories — ARIO SCRIPTS" },
      { property: "og:description", content: "Combat, automation, ESP, farming, teleport, utilities, UI and more script categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">Find scripts by what they do</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(categories.data ?? []).map((c) => (
          <Link key={c.id} to="/categories/$slug" params={{ slug: c.slug }} className="glass card-hover rounded-2xl p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <DynamicIcon name={c.icon} size={18} />
            </span>
            <p className="mt-3 font-display font-semibold">{c.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
