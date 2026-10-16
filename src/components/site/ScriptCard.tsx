import { Link } from "@tanstack/react-router";
import { BadgeCheck, Copy, Download, Eye, Heart, Star, Gamepad2, SearchX, ArrowRight, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Script } from "@/lib/types";
import { compact } from "@/lib/format";

export function ScriptCard({ script }: { script: Script }) {
  const status = script.status?.toLowerCase() ?? "working";
  const statusColor =
    status === "working" ? "text-[var(--success)]" : status === "patched" ? "text-destructive" : "text-[var(--warning)]";

  return (
    <Link
      to="/scripts/$slug"
      params={{ slug: script.slug }}
      className="glass card-hover group flex min-w-0 flex-col overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        {script.image_url ? (
          <img
            src={script.image_url}
            alt={script.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_28%,transparent),transparent)]">
            <Gamepad2 className="text-primary/70" size={34} />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {script.featured && (
            <span className="chip bg-primary/20 text-primary">
              <Star size={11} /> Featured
            </span>
          )}
          {script.verified && (
            <span className="chip bg-[var(--accent)]/15 text-[var(--accent)]">
              <BadgeCheck size={11} /> Verified
            </span>
          )}
        </div>
        <span className={`chip absolute right-2 top-2 capitalize ${statusColor}`}>{status}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="truncate font-display text-base font-semibold text-foreground">{script.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{script.game_name}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {script.categories?.name && <span className="chip text-muted-foreground">{script.categories.name}</span>}
          <span className="chip text-muted-foreground">v{script.version}</span>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center justify-center gap-1"><Eye size={12} className="shrink-0" />{compact(script.views)}</span>
          <span className="flex min-w-0 items-center justify-center gap-1"><Download size={12} className="shrink-0" />{compact(script.downloads)}</span>
          <span className="flex min-w-0 items-center justify-center gap-1"><Copy size={12} className="shrink-0" />{compact(script.copies)}</span>
          <span className="flex min-w-0 items-center justify-center gap-1"><Heart size={12} className="shrink-0" />{compact(script.favorites)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ScriptGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="script-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading scripts" role="status">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="ario-script-skeleton glass overflow-hidden rounded-2xl">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-px w-full" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, metric) => <Skeleton key={metric} className="h-3 w-full" />)}
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading script library…</span>
    </div>
  );
}

export function DataErrorState({ title = "Couldn't load this content", message = "Check your connection and try again." }: { title?: string; message?: string }) {
  return (
    <div className="ario-state-card glass mx-auto flex max-w-xl flex-col items-center rounded-2xl px-6 py-10 text-center" role="alert">
      <span className="ario-state-icon ario-state-icon-error"><AlertTriangle size={21} /></span>
      <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      <button type="button" onClick={() => window.location.reload()} className="btn btn-ghost mt-5">
        <ArrowRight size={14} /> Retry
      </button>
    </div>
  );
}

export function ScriptGrid({ scripts }: { scripts: Script[] }) {
  if (!scripts.length) {
    return (
      <div className="ario-state-card ario-empty-state glass mx-auto flex max-w-xl flex-col items-center rounded-2xl px-6 py-10 text-center">
        <span className="ario-state-icon"><SearchX size={22} /></span>
        <h2 className="mt-4 font-display text-base font-semibold">Nothing to show yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">There aren't any scripts in this collection yet. Browse the full library to discover what's available.</p>
        <Link to="/scripts" className="btn btn-ghost mt-5">Explore scripts <ArrowRight size={14} /></Link>
      </div>
    );
  }
  return (
    <div className="script-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {scripts.map((s) => (
        <ScriptCard key={s.id} script={s} />
      ))}
    </div>
  );
}
