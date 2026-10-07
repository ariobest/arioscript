import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgeCheck, Copy, Download, Eye, Flag, Heart, Share2, Star, Tag, Clock, Gamepad2, ArrowLeft, History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SCRIPT_SELECT } from "@/lib/queries";
import { CodeViewer } from "@/components/site/CodeViewer";
import { recordEvent } from "@/lib/events";
import { useAuth } from "@/hooks/useAuth";
import { compact, formatDate } from "@/lib/format";
import type { Script } from "@/lib/types";
import { loaderCommand, validRawLoaderUrl } from "@/lib/loader";

export const Route = createFileRoute("/scripts/$slug")({
  head: () => ({ meta: [{ title: 'Script Details — ARIO SCRIPTS' }, { name: "description", content: 'Explore Lua script details, code and showcase on ARIO SCRIPTS.' }, { property: "og:title", content: 'Script Details — ARIO SCRIPTS' }, { property: "og:description", content: 'Explore Lua script details, code and showcase on ARIO SCRIPTS.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ScriptPage,
});

function ytEmbed(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function ScriptPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("Not working");
  const [details, setDetails] = useState("");
  const [quickCopied, setQuickCopied] = useState(false);

  const script = useQuery({
    queryKey: ["script", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("scripts").select(SCRIPT_SELECT).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as unknown as Script | null;
    },
  });

  const versions = useQuery({ queryKey: ["script-versions", script.data?.id], enabled: !!script.data?.id, queryFn: async () => { const { data, error } = await (supabase as any).from("script_versions").select("id,version,changelog,created_at").eq("script_id", script.data!.id).order("created_at", { ascending: false }).limit(20); if (error) throw error; return data ?? []; } });

  const fav = useQuery({
    queryKey: ["fav", script.data?.id, user?.id],
    enabled: !!script.data?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("script_id", script.data!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (script.data?.id) void recordEvent(script.data.id, "view").then(() => {
      void qc.invalidateQueries({ queryKey: ["script", slug] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    }).catch(() => { /* Keep the page readable when event recording is unavailable. */ });
  }, [script.data?.id, slug, qc]);

  if (script.isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-muted-foreground">Loading script…</div>;
  }
  const s = script.data;
  if (!s) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-xl font-semibold">Script not found</h1>
        <Link to="/scripts" className="btn btn-primary mt-6">Browse scripts</Link>
      </div>
    );
  }

  async function toggleFavorite() {
    if (!user) {
      toast.error("Sign in to favorite scripts");
      return;
    }
    if (fav.data) {
      const { error } = await supabase.from("favorites").delete().eq("script_id", s!.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast("Removed from favorites");
    } else {
      const { error } = await supabase.from("favorites").insert({ script_id: s!.id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Added to favorites");
    }
    void qc.invalidateQueries({ queryKey: ["fav"] });
    void qc.invalidateQueries({ queryKey: ["script", slug] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
    void qc.invalidateQueries({ queryKey: ["s"] });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: s!.name, url });
      else await navigator.clipboard.writeText(url);
      toast.success("Link shared");
      try { await recordEvent(s!.id, "share"); void qc.invalidateQueries({ queryKey: ["script", slug] }); } catch { toast.error("Share count could not be updated"); }
    } catch {
      /* cancelled */
    }
  }

  async function quickCopy() {
    const copyable = s!.raw_loader_url && validRawLoaderUrl(s!.raw_loader_url)
      ? loaderCommand(s!.raw_loader_url)
      : s!.code;
    if (!copyable) return toast.error("No code is available to copy");
    try {
      await navigator.clipboard.writeText(copyable);
      setQuickCopied(true);
      toast.success(s!.raw_loader_url ? "Loader copied to clipboard" : "Script copied to clipboard");
      await recordEvent(s!.id, "copy");
      void qc.invalidateQueries({ queryKey: ["script", slug] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
      window.setTimeout(() => setQuickCopied(false), 2000);
    } catch {
      toast.error("Could not copy the script");
    }
  }

  async function submitReport() {
    if (!user) {
      toast.error("Sign in to report a script");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      script_id: s!.id,
      user_id: user.id,
      reason,
      description: details || null,
    });
    if (error) toast.error("Could not send report");
    else {
      toast.success("Report sent to the team");
      setReportOpen(false);
      setDetails("");
    }
  }

  const embed = ytEmbed(s.youtube_url);
  const statusColor = s.status === "working" ? "text-[var(--success)]" : s.status === "patched" ? "text-destructive" : "text-[var(--warning)]";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:py-8 sm:pb-8">
      <Link to="/scripts" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> Back to scripts
      </Link>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <div className="glass overflow-hidden rounded-2xl">
            {s.image_url ? (
              <img src={s.image_url} alt={s.name} className="aspect-[16/7] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/7] items-center justify-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_25%,transparent),transparent)]">
                <Gamepad2 size={40} className="text-primary/70" />
              </div>
            )}
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                {s.featured && <span className="chip text-primary"><Star size={11} /> Featured</span>}
                {s.verified && <span className="chip text-[var(--accent)]"><BadgeCheck size={11} /> Verified</span>}
                <span className={`chip capitalize ${statusColor}`}>{s.status}</span>
                <span className="chip text-muted-foreground">v{s.version}</span>
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{s.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.game_name}
                {s.categories?.name ? ` · ${s.categories.name}` : ""}
              </p>
              {s.description && <p className="mt-4 text-sm leading-relaxed text-foreground/80">{s.description}</p>}
              {s.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className="chip text-muted-foreground"><Tag size={10} /> {t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {s.raw_loader_url && validRawLoaderUrl(s.raw_loader_url) && <div>
            <h2 className="mb-3 font-display text-lg font-semibold">Loader</h2>
            <CodeViewer code={loaderCommand(s.raw_loader_url)} filename={`${s.slug}-loader.lua`} downloadEnabled={s.download_enabled} onCopy={() => { void recordEvent(s.id, "copy").then(() => { void qc.invalidateQueries({ queryKey: ["script", slug] }); void qc.invalidateQueries({ queryKey: ["stats"] }); }).catch(() => toast.error("Copy count could not be updated")); toast.success("Loader copied to clipboard"); }} onDownload={() => { void recordEvent(s.id, "download").then(() => { void qc.invalidateQueries({ queryKey: ["script", slug] }); void qc.invalidateQueries({ queryKey: ["stats"] }); }).catch(() => toast.error("Download count could not be updated")); }} />
          </div>}

          {versions.data?.length ? <section className="glass rounded-2xl p-5"><div className="flex items-center gap-2"><History size={16} className="text-primary"/><h2 className="font-display text-lg font-semibold">Version history</h2></div><div className="mt-4 space-y-2">{versions.data.map((v:any)=><div key={v.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><span className="chip text-primary">v{v.version}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{v.changelog||"Version update"}</p><p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p></div></div>)}</div></section> : null}

          {s.code && <CodeViewer
            code={s.code}
            filename={`${s.slug}.lua`}
            downloadEnabled={s.download_enabled}
            onCopy={() => {
              void recordEvent(s.id, "copy").then(() => { void qc.invalidateQueries({ queryKey: ["script", slug] }); void qc.invalidateQueries({ queryKey: ["stats"] }); }).catch(() => toast.error("Copy count could not be updated"));
              toast.success("Script copied to clipboard");
            }}
            onDownload={() => {
              void recordEvent(s.id, "download").then(() => { void qc.invalidateQueries({ queryKey: ["script", slug] }); void qc.invalidateQueries({ queryKey: ["stats"] }); }).catch(() => toast.error("Download count could not be updated"));
              toast.success("Downloading .lua file");
            }}
          />}

          {embed && (
            <div className="glass overflow-hidden rounded-2xl">
              <div className="border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground">Showcase</div>
              <div className="aspect-video">
                <iframe src={embed} title="Showcase" allowFullScreen className="h-full w-full" />
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: Eye, label: "Views", value: s.views },
                { icon: Download, label: "Downloads", value: s.downloads },
                { icon: Copy, label: "Copies", value: s.copies },
                { icon: Heart, label: "Favorites", value: s.favorites },
                { icon: Share2, label: "Shares", value: s.shares },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border p-3">
                  <m.icon size={14} className="text-primary" />
                  <p className="mt-1.5 font-display text-lg font-bold">{compact(m.value)}</p>
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} /> Updated {formatDate(s.updated_at)}
            </p>
          </div>

          <div className="glass hidden space-y-2 rounded-2xl p-4 lg:block">
            <button onClick={() => void toggleFavorite()} className={`btn w-full ${fav.data ? "btn-primary" : "btn-ghost"}`}>
              <Heart size={15} fill={fav.data ? "currentColor" : "none"} />
              {fav.data ? "Favorited" : "Add to favorites"}
            </button>
            <button onClick={() => void share()} className="btn btn-ghost w-full">
              <Share2 size={15} /> Share script
            </button>
            <button onClick={() => setReportOpen((v) => !v)} className="btn btn-ghost w-full text-destructive">
              <Flag size={15} /> Report script
            </button>

            {reportOpen && (
              <div className="fade-up space-y-2 rounded-xl border border-border p-3">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-base">
                  {["Not working", "Patched", "Malicious code", "Stolen script", "Wrong information", "Other"].map((r) => (
                    <option key={r} value={r} className="bg-background">{r}</option>
                  ))}
                </select>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="More details (optional)"
                  rows={3}
                  className="input-base"
                />
                <button onClick={() => void submitReport()} className="btn btn-primary w-full">Send report</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="mobile-action-dock lg:hidden" aria-label="Script actions">
        <button onClick={() => void quickCopy()} className="mobile-action mobile-action-primary">
          {quickCopied ? <BadgeCheck size={18} /> : <Copy size={18} />}
          <span>{quickCopied ? "Copied" : "Copy"}</span>
        </button>
        <button onClick={() => void toggleFavorite()} className={`mobile-action ${fav.data ? "text-primary" : ""}`}>
          <Heart size={18} fill={fav.data ? "currentColor" : "none"} />
          <span>{fav.data ? "Saved" : "Favorite"}</span>
        </button>
        <button onClick={() => void share()} className="mobile-action"><Share2 size={18} /><span>Share</span></button>
        <button onClick={() => setReportOpen((v) => !v)} className="mobile-action text-destructive"><Flag size={18} /><span>Report</span></button>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-[color-mix(in_oklab,var(--background)_70%,transparent)] p-3 backdrop-blur-sm lg:hidden" onClick={() => setReportOpen(false)}>
          <div className="glass fade-up w-full space-y-3 rounded-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-semibold">Report script</h2>
              <button onClick={() => setReportOpen(false)} className="btn btn-ghost h-10 w-10 !p-0" aria-label="Close report form">×</button>
            </div>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-base">
              {["Not working", "Patched", "Malicious code", "Stolen script", "Wrong information", "Other"].map((r) => <option key={r} value={r} className="bg-background">{r}</option>)}
            </select>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="More details (optional)" rows={3} className="input-base" />
            <button onClick={() => void submitReport()} className="btn btn-primary w-full">Send report</button>
          </div>
        </div>
      )}
    </div>
  );
}
