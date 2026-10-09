import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Link2, Copy, Eye, EyeOff, Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { slugify, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/raw")({
  head: () => ({ meta: [{ title: "Raw Loader — ARIO SCRIPTS" }, { name: "description", content: "Manage raw Lua scripts with public raw URLs." }, { property: "og:title", content: "Raw Loader — ARIO SCRIPTS" }, { property: "og:description", content: "Manage raw Lua scripts with public raw URLs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminRaw,
});

type Raw = { id: string; name: string; slug: string; code: string; enabled: boolean; is_protected?: boolean; protected_message?: string; updated_at: string };
type Draft = Partial<Raw>;

const rawUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/raw/${slug}`;

async function copy(text: string, label: string) {
  try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); } catch { toast.error("Could not copy"); }
}

function AdminRaw() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const list = useQuery({
    queryKey: ["raw_scripts"],
    retry: 1,
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("raw_scripts").select("id,name,slug,code,enabled,is_protected,protected_message,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Raw[];
    },
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["raw_scripts"] });

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Only administrators can manage raw scripts.</p>;

  async function save() {
    if (!draft || !user) return;
    const name = draft.name?.trim() ?? "";
    const slug = slugify(draft.slug?.trim() || name).toLowerCase().slice(0, 80);
    if (!name || !slug) return toast.error("Name is required");
    if (!draft.code?.trim()) return toast.error("Lua code is required");
    const payload = { name, slug, code: draft.code, enabled: draft.enabled !== false, is_protected: draft.is_protected === true, protected_message: (draft.protected_message || "ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM").slice(0, 180) };
    const { error } = draft.id
      ? await supabase.from("raw_scripts").update(payload).eq("id", draft.id)
      : await supabase.from("raw_scripts").insert(payload);
    if (error) return toast.error(error.code === "23505" ? "That URL name is already used" : `Could not save raw script: ${error.message}`);
    await adminLog({ adminId: user.id, action: draft.id ? "edited raw script" : "added raw script", targetType: "raw_script", details: name });
    toast.success(draft.id ? "Raw script updated" : "Raw script created");
    setDraft(null);
    refresh();
  }

  async function toggle(r: Raw) {
    const { error } = await supabase.from("raw_scripts").update({ enabled: !r.enabled }).eq("id", r.id);
    if (error) return toast.error(`Could not update raw URL: ${error.message}`);
    toast.success(r.enabled ? "Raw URL disabled" : "Raw URL enabled");
    refresh();
  }

  async function remove(r: Raw) {
    if (!user || !confirm(`Delete "${r.name}"? Its raw URL will stop working.`)) return;
    const { error } = await supabase.from("raw_scripts").delete().eq("id", r.id);
    if (error) return toast.error(`Could not delete raw script: ${error.message}`);
    await adminLog({ adminId: user.id, action: "deleted raw script", targetType: "raw_script", details: r.name });
    toast.success("Raw script deleted");
    refresh();
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Raw loader</h1>
        <Button className="ml-auto" onClick={() => setDraft({ name: "", slug: "", code: "", enabled: true, is_protected: false, protected_message: "ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM" })}><Plus size={15} /> New raw script</Button>
      </div>

      <div className="grid gap-3">
        {(list.data ?? []).map((r) => (
          <div key={r.id} className="glass min-w-0 rounded-2xl p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name} {!r.enabled && <span className="chip ml-1 text-muted-foreground">Disabled</span>}</p>
                <p className="truncate font-mono text-xs text-primary">{rawUrl(r.slug)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Updated {timeAgo(r.updated_at)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => void copy(rawUrl(r.slug), "Raw URL")} className="btn btn-primary h-10 !px-3 !py-0 text-xs"><Link2 size={14} /> Copy Raw URL</button>
              <button onClick={() => void copy(r.code, "Script")} className="btn btn-ghost h-10 !px-3 !py-0 text-xs"><Copy size={14} /> Copy Script</button>
              <div className="ml-auto flex gap-1">
                <button title={r.enabled ? "Disable" : "Enable"} onClick={() => void toggle(r)} className="btn btn-ghost h-10 w-10 !p-0">{r.enabled ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button title="Edit" onClick={() => setDraft(r)} className="btn btn-ghost h-10 w-10 !p-0"><Pencil size={14} /></button>
                <button title="Delete" onClick={() => void remove(r)} className="btn btn-ghost h-10 w-10 !p-0 text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {list.isLoading && <p className="text-sm text-muted-foreground">Loading raw scripts…</p>}
        {list.error && <div className="glass rounded-xl border border-destructive/30 p-4 text-sm"><p className="font-medium text-destructive">Could not load raw scripts</p><p className="mt-1 break-words text-muted-foreground">{list.error instanceof Error ? list.error.message : (typeof list.error === "object" && list.error !== null && "message" in list.error ? String((list.error as { message?: unknown }).message ?? JSON.stringify(list.error)) : String(list.error ?? "Unknown database error"))}</p><button className="btn btn-ghost mt-3" onClick={() => void list.refetch()}>Retry</button></div>}
        {list.data && !list.data.length && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No raw scripts yet — create your first one.</div>}
      </div>

      {draft && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4" onClick={() => setDraft(null)}>
          <div className="glass mx-auto my-6 w-full max-w-2xl rounded-2xl p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">{draft.id ? "Edit raw script" : "New raw script"}</h2>
              <button onClick={() => setDraft(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={15} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="input-base" placeholder="Name" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className="input-base font-mono" placeholder="url-name (optional)" value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              <p className="truncate font-mono text-xs text-muted-foreground sm:col-span-2">{rawUrl(slugify(draft.slug?.trim() || draft.name || "") || "…")}</p>
              <div className="sm:col-span-2"><input ref={fileInput} type="file" accept=".lua,text/plain" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (!file.name.toLowerCase().endsWith(".lua")) { toast.error("Choose a .lua file"); e.currentTarget.value = ""; return; } if (file.size > 2097152) { toast.error("Lua files must be 2 MB or smaller"); e.currentTarget.value = ""; return; } const code = await file.text(); setDraft((prev) => prev ? { ...prev, name: prev.name?.trim() ? prev.name : file.name.replace(/\.lua$/i, ""), code } : prev); toast.success("Lua file loaded"); e.currentTarget.value = ""; }} /><button type="button" onClick={() => fileInput.current?.click()} className="btn btn-ghost mb-2 h-10 !px-3 text-xs"><Upload size={14} /> Upload .lua file</button><textarea className="input-base w-full font-mono text-xs" rows={14} spellCheck={false} placeholder="-- Lua code (or upload a .lua file)" value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={draft.is_protected === true} onChange={(e) => setDraft({ ...draft, is_protected: e.target.checked, protected_message: draft.protected_message || "ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM" })} /><ShieldCheck size={15} /> Protect browser view</label>{draft.is_protected && <input className="input-base sm:col-span-2" placeholder="Message shown to browser visitors" value={draft.protected_message ?? "ADMIN REQUIRED GO PLAY WITH THE SCRIPT DUM"} onChange={(e) => setDraft({ ...draft, protected_message: e.target.value })} />}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={draft.enabled !== false} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Raw URL enabled</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDraft(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => void save()} className="btn btn-primary">{draft.id ? "Save changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
