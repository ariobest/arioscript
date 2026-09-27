import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Upload, Trash2, RefreshCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { uploadSiteImage, storedImagePath } from "@/lib/media";

export const Route = createFileRoute("/admin/media")({ component: MediaManager, head: () => ({ meta: [{ title: "Media Manager — ARIO SCRIPTS" }, { name: "description", content: "Manage ARIO SCRIPTS site imagery." }, { property: "og:title", content: "Media Manager — ARIO SCRIPTS" }, { property: "og:description", content: "Manage ARIO SCRIPTS site imagery." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }) });

type MediaFile = { name: string; created_at: string | null; metadata?: { size?: number } | null; url: string; bucket: string; used: string[] };

function MediaManager() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const files = useQuery({ queryKey: ["media-manager"], enabled: isAdmin, queryFn: async () => {
    const [scripts, settings, profiles, categories] = await Promise.all([
      supabase.from("scripts").select("name,image_url"), supabase.from("site_settings").select("logo_url,favicon_url,hero_image_url").eq("id", 1).single(),
      supabase.from("profiles").select("username,avatar_url"), supabase.from("categories").select("name,image_url"),
    ]);
    const refs = new Map<string, string[]>();
    const add = (url: string | null | undefined, label: string) => { if (!url) return; refs.set(url, [...(refs.get(url) ?? []), label]); };
    scripts.data?.forEach(s => add(s.image_url, `Script: ${s.name}`));
    profiles.data?.forEach(p => add(p.avatar_url, `Profile: ${p.username}`));
    categories.data?.forEach(c => add(c.image_url, `Category: ${c.name}`));
    add(settings.data?.logo_url, "Logo"); add(settings.data?.favicon_url, "Favicon"); add(settings.data?.hero_image_url, "Hero image");
    const all: MediaFile[] = [];
    for (const bucket of ["thumbnails", "site-media", "avatars"]) {
      const { data, error } = await supabase.storage.from(bucket).list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const entries = bucket === "avatars" ? (await Promise.all((data ?? []).filter(entry => !entry.id).map(async directory => (await supabase.storage.from(bucket).list(directory.name, { limit: 1000 })).data?.map(file => ({ ...file, name: `${directory.name}/${file.name}` })) ?? []))).flat() : data ?? [];
      for (const file of entries) {
        if (!file.id) continue;
        const { data: link } = await supabase.storage.from(bucket).createSignedUrl(file.name, 60 * 60);
        const used = Array.from(refs.entries()).filter(([url]) => storedImagePath(url, bucket) === file.name).flatMap(([, labels]) => labels);
        all.push({ name: file.name, created_at: file.created_at, metadata: file.metadata, url: link?.signedUrl ?? "", bucket, used });
      }
    }
    return all;
  }});
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try { await uploadSiteImage(file); toast.success("Image uploaded"); await qc.invalidateQueries({ queryKey: ["media-manager"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function remove(file: MediaFile) {
    if (file.used.length || file.bucket === "avatars") return toast.error("Images still in use or owned by a member cannot be deleted here.");
    if (!confirm(`Delete ${file.name}?`)) return;
    const { error } = await supabase.storage.from(file.bucket).remove([file.name]);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "deleted image", targetType: "media", details: file.name });
    toast.success("Image deleted"); void qc.invalidateQueries({ queryKey: ["media-manager"] });
  }
  async function replace(file: MediaFile, image?: File) {
    if (!image || file.bucket === "avatars") return;
    setBusy(true);
    try {
      const url = await uploadSiteImage(image);
      for (const usage of file.used) {
        if (usage.startsWith("Script: ")) {
          const { error } = await supabase.from("scripts").update({ image_url: url }).eq("image_url", await referencedUrl(file, usage));
          if (error) throw error;
        } else if (usage.startsWith("Category: ")) {
          const { error } = await supabase.from("categories").update({ image_url: url }).eq("image_url", await referencedUrl(file, usage));
          if (error) throw error;
        } else if (["Logo", "Favicon", "Hero image"].includes(usage)) {
          const column = usage === "Logo" ? "logo_url" : usage === "Favicon" ? "favicon_url" : "hero_image_url";
          const { error } = await supabase.from("site_settings").update({ [column]: url }).eq("id", 1);
          if (error) throw error;
        }
      }
      if (user) await adminLog({ adminId: user.id, action: "replaced image", targetType: "media", details: file.name });
      toast.success("Replacement uploaded and linked. The old image remains available for safe removal later.");
      void qc.invalidateQueries({ queryKey: ["site_settings"] });
      void qc.invalidateQueries({ queryKey: ["admin_scripts"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["media-manager"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Replace failed"); }
    finally { setBusy(false); }
  }
  async function referencedUrl(file: MediaFile, usage: string) {
    if (usage.startsWith("Script: ")) {
      const { data } = await supabase.from("scripts").select("image_url").eq("name", usage.slice(8)).limit(1).maybeSingle();
      if (storedImagePath(data?.image_url ?? null, file.bucket) === file.name) return data?.image_url ?? "";
    }
    if (usage.startsWith("Category: ")) {
      const { data } = await supabase.from("categories").select("image_url").eq("name", usage.slice(10)).limit(1).maybeSingle();
      if (storedImagePath(data?.image_url ?? null, file.bucket) === file.name) return data?.image_url ?? "";
    }
    throw new Error("Image link changed. Refresh and try again.");
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-bold">Media manager</h1><label className="btn btn-primary ml-auto cursor-pointer"><Upload size={15} /> {busy ? "Uploading…" : "Upload image"}<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label></div>
    <p className="text-xs text-muted-foreground">Only unused site images and thumbnails can be removed. Replacements create a new image URL to avoid breaking existing pages.</p>
    {files.isLoading && <p className="text-sm text-muted-foreground">Loading images…</p>}
    {files.error && <p className="text-sm text-destructive">Could not load images: {files.error.message}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{files.data?.map(f => <div key={`${f.bucket}/${f.name}`} className="glass overflow-hidden rounded-lg"><div className="grid aspect-video place-items-center bg-secondary">{f.url ? <img src={f.url} alt={f.name} className="h-full w-full object-contain" /> : <Image size={24} />}</div><div className="space-y-2 p-3 text-xs"><p className="truncate font-semibold" title={f.name}>{f.name}</p><p className="text-muted-foreground">{f.bucket} · {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : "Size unavailable"} · {f.created_at ? new Date(f.created_at).toLocaleDateString() : "Date unavailable"}</p><p className="text-muted-foreground">{f.used.length ? f.used.join(", ") : "Unused"}</p><div className="flex gap-1">{f.url && <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-ghost !p-2" title="Preview"><ExternalLink size={14} /></a>}<label className="btn btn-ghost cursor-pointer !p-2" title="Upload replacement"><RefreshCcw size={14} /><input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void replace(f, e.target.files?.[0])} /></label><button title="Delete unused image" disabled={!!f.used.length || f.bucket === "avatars"} className="btn btn-ghost !p-2 text-destructive disabled:opacity-40" onClick={() => void remove(f)}><Trash2 size={14} /></button></div></div></div>)}</div>
    {!files.isLoading && !files.data?.length && <p className="py-8 text-center text-sm text-muted-foreground">No images uploaded yet.</p>}
  </div>;
}
