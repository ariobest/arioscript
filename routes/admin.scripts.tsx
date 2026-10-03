import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, Pencil, Trash2, Archive, Star, BadgeCheck, Eye, EyeOff, X, BarChart3, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SCRIPT_SELECT, getCategories } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { compact, slugify, timeAgo } from "@/lib/format";
import type { Script } from "@/lib/types";
import { uploadSiteImage } from "@/lib/media";
import { loaderCommand, validRawLoaderUrl } from "@/lib/loader";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/admin/scripts")({
  head: () => ({ meta: [{ title: 'Manage Scripts — ARIO SCRIPTS' }, { name: "description", content: 'Add and manage scripts in the ARIO SCRIPTS library.' }, { property: "og:title", content: 'Manage Scripts — ARIO SCRIPTS' }, { property: "og:description", content: 'Add and manage scripts in the ARIO SCRIPTS library.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminScripts,
});

type Draft = Partial<Script> & { tagsText?: string };

const EMPTY: Draft = {
  name: "", game_name: "", description: "", code: "", version: "1.0.0", status: "working",
  featured: false, verified: false, published: true, archived: false, download_enabled: true,
  image_url: "", youtube_url: "", raw_loader_url: "", tagsText: "",
};

function AdminScripts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [statsFor, setStatsFor] = useState<Script | null>(null);
  const [search, setSearch] = useState("");
  const [copiedLoader, setCopiedLoader] = useState(false);

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const scripts = useQuery({
    queryKey: ["admin_scripts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scripts").select(SCRIPT_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Script[];
    },
  });

  const analytics = useQuery({
    queryKey: ["script_analytics", statsFor?.id],
    enabled: !!statsFor,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("script_analytics", { _script_id: statsFor!.id });
      if (error) throw error;
      return data as unknown as Record<string, number>;
    },
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin_scripts"] });
    void qc.invalidateQueries({ queryKey: ["s"] });
  }

  async function save() {
    if (!draft || !user) return;
    if (!draft.name?.trim() || (!draft.code?.trim() && !draft.raw_loader_url?.trim())) {
      toast.error("Name and Lua code or a raw loader URL are required");
      return;
    }
    if (draft.raw_loader_url?.trim() && !validRawLoaderUrl(draft.raw_loader_url.trim())) {
      toast.error("Use a public HTTPS raw Lua URL without credentials");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug || slugify(draft.name),
      game_name: draft.game_name?.trim() || "Universal",
      description: draft.description ?? null,
      category_id: draft.category_id ?? null,
      code: draft.code,
      image_url: draft.image_url || null,
      youtube_url: draft.youtube_url || null,
      raw_loader_url: draft.raw_loader_url?.trim() || null,
      tags: (draft.tagsText ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      version: draft.version || "1.0.0",
      status: draft.status || "working",
      featured: !!draft.featured,
      verified: !!draft.verified,
      published: draft.published !== false,
      archived: !!draft.archived,
      download_enabled: draft.download_enabled !== false,
    };

    if (draft.id) {
      const { error } = await supabase.from("scripts").update(payload).eq("id", draft.id);
      if (error) return toast.error(error.message);
      await adminLog({ adminId: user.id, action: "edited script", targetType: "script", targetId: draft.id, details: payload.name });
      toast.success("Script updated");
    } else {
      const { error } = await supabase.from("scripts").insert(payload);
      if (error) return toast.error(error.message);
      await adminLog({ adminId: user.id, action: "added script", targetType: "script", details: payload.name });
      toast.success("Script published");
    }
    setDraft(null);
    refresh();
  }

  async function patch(s: Script, values: Partial<Script>, label: string) {
    const { categories: _c, ...rest } = values;
    void _c;
    const { error } = await supabase.from("scripts").update(rest).eq("id", s.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: label, targetType: "script", targetId: s.id, details: s.name });
    toast.success(label);
    refresh();
  }

  async function remove(s: Script) {
    if (!confirm(`Delete "${s.name}" permanently?`)) return;
    const { error } = await supabase.from("scripts").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "deleted script", targetType: "script", details: s.name });
    toast.success("Script deleted");
    refresh();
  }

  async function uploadImage(file: File) {
    try { const url = await uploadSiteImage(file); setDraft((d) => ({ ...(d ?? {}), image_url: url })); toast.success("Thumbnail uploaded"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
  }

  const rows = (scripts.data ?? []).filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.game_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Scripts</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input-base min-w-0 flex-1 sm:ml-auto sm:max-w-48 sm:flex-none" />
        <Button onClick={() => { setCopiedLoader(false); setDraft({ ...EMPTY }); }}><Plus size={15} /> Add script</Button>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Script</th>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Stats</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">v{s.version} · {s.categories?.name ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.game_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {compact(s.views)} v · {compact(s.downloads)} d · {compact(s.copies)} c
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`chip capitalize ${s.status === "working" ? "text-[var(--success)]" : "text-destructive"}`}>{s.status}</span>
                    {s.featured && <span className="chip text-primary">Featured</span>}
                    {s.verified && <span className="chip text-[var(--accent)]">Verified</span>}
                    {!s.published && <span className="chip text-muted-foreground">Draft</span>}
                    {s.archived && <span className="chip text-muted-foreground">Archived</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(s.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button title="Analytics" onClick={() => setStatsFor(s)} className="btn btn-ghost !p-1.5"><BarChart3 size={14} /></button>
                    <button title="Feature" onClick={() => void patch(s, { featured: !s.featured }, s.featured ? "unfeatured script" : "featured script")} className="btn btn-ghost !p-1.5"><Star size={14} /></button>
                    <button title="Verify" onClick={() => void patch(s, { verified: !s.verified }, s.verified ? "unverified script" : "verified script")} className="btn btn-ghost !p-1.5"><BadgeCheck size={14} /></button>
                    <button title="Publish" onClick={() => void patch(s, { published: !s.published }, s.published ? "unpublished script" : "published script")} className="btn btn-ghost !p-1.5">{s.published ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button title="Archive" onClick={() => void patch(s, { archived: !s.archived }, s.archived ? "restored script" : "archived script")} className="btn btn-ghost !p-1.5"><Archive size={14} /></button>
                    <button title="Edit" onClick={() => { setCopiedLoader(false); setDraft({ ...s, tagsText: (s.tags ?? []).join(", ") }); }} className="btn btn-ghost !p-1.5"><Pencil size={14} /></button>
                    <button title="Delete" onClick={() => void remove(s)} className="btn btn-ghost !p-1.5 text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No scripts yet — add your first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {statsFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setStatsFor(null)}>
          <div className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold">{statsFor.name}</h2>
              <button onClick={() => setStatsFor(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={14} /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {Object.entries(analytics.data ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border p-3">
                  <p className="font-display text-lg font-bold">{compact(v)}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">{k.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={() => setDraft(null)}>
          <div className="glass mx-auto my-6 w-full max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">{draft.id ? "Edit script" : "Add script"}</h2>
              <button onClick={() => setDraft(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={15} /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="input-base" placeholder="Script name" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className="input-base" placeholder="Game name" value={draft.game_name ?? ""} onChange={(e) => setDraft({ ...draft, game_name: e.target.value })} />
              <select className="input-base" value={draft.category_id ?? ""} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
                <option value="" className="bg-background">No category</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id} className="bg-background">{c.name}</option>
                ))}
              </select>
              <select className="input-base" value={draft.status ?? "working"} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {["working", "patched", "testing", "outdated"].map((s) => (
                  <option key={s} value={s} className="bg-background capitalize">{s}</option>
                ))}
              </select>
              <input className="input-base" placeholder="Version" value={draft.version ?? ""} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
              <input className="input-base" placeholder="Tags (comma separated)" value={draft.tagsText ?? ""} onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })} />
              <input className="input-base" placeholder="Thumbnail URL" value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
              <input className="input-base" placeholder="YouTube showcase URL" value={draft.youtube_url ?? ""} onChange={(e) => setDraft({ ...draft, youtube_url: e.target.value })} />
              <div className="min-w-0 sm:col-span-2">
                <label htmlFor="raw-loader-url" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Raw loader link</label>
                <input id="raw-loader-url" type="url" className="input-base" placeholder="https://example.com/script.lua" value={draft.raw_loader_url ?? ""} onChange={(e) => { setCopiedLoader(false); setDraft({ ...draft, raw_loader_url: e.target.value }); }} />
                <p className="mt-1.5 text-xs text-muted-foreground">Use a public HTTPS raw Lua file. Only add links you trust; its contents can change outside this site.</p>
              </div>
              {draft.raw_loader_url?.trim() && validRawLoaderUrl(draft.raw_loader_url.trim()) && <div className="min-w-0 rounded-md border border-border bg-secondary/50 p-3 sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold">Generated loader</span><Button variant="ghost" size="sm" title="Copy loader" aria-label="Copy loader" onClick={async () => { try { await navigator.clipboard.writeText(loaderCommand(draft.raw_loader_url?.trim() ?? "")); setCopiedLoader(true); toast.success("Loader copied"); } catch { toast.error("Could not copy loader"); } }}>{copiedLoader ? <Check size={14} /> : <Copy size={14} />}</Button></div>
                <code className="block overflow-x-auto whitespace-pre font-mono text-xs text-primary">{loaderCommand(draft.raw_loader_url.trim())}</code>
              </div>}
              <label className="btn btn-ghost cursor-pointer sm:col-span-2">
                <Upload size={14} /> Upload thumbnail image
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0])} />
              </label>
              <textarea className="input-base sm:col-span-2" rows={3} placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <textarea className="input-base sm:col-span-2 font-mono text-xs" rows={10} placeholder="-- Lua code here (optional when a raw loader link is set)" value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {([
                ["featured", "Featured"],
                ["verified", "Verified"],
                ["published", "Published"],
                ["download_enabled", "Downloads enabled"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={key === "published" || key === "download_enabled" ? draft[key] !== false : !!draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDraft(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => void save()} className="btn btn-primary">{draft.id ? "Save changes" : "Publish script"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
