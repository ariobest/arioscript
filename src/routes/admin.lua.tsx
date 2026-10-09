import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileUp, Copy, Trash2, ExternalLink, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { slugify, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/lua")({
  head: () => ({ meta: [{ title: "Lua Uploads — ARIO SCRIPTS" }, { name: "description", content: "Upload and manage standalone Lua files." }] }),
  component: AdminLuaUploads,
});

type LuaFile = {
  id: string;
  name: string;
  slug: string;
  code: string;
  enabled: boolean;
  updated_at: string;
};

const rawUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/raw/${slug}`;

function AdminLuaUploads() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");

  const files = useQuery({
    queryKey: ["raw_scripts"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_scripts")
        .select("id,name,slug,code,enabled,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LuaFile[];
    },
  });

  if (!isAdmin) {
    return <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Only administrators can upload Lua files.</div>;
  }

  async function uploadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".lua")) {
      toast.error("Choose a .lua file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Lua files must be 2 MB or smaller");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("That Lua file is empty");
        return;
      }
      const baseName = file.name.replace(/\.lua$/i, "");
      setName(baseName);
      setSlug(slugify(baseName));
      setCode(text);
      setSelectedFile(file.name);
      toast.success("Lua file ready to upload");
    } catch {
      toast.error("Could not read that Lua file");
    }
  }

  async function save() {
    if (!user || busy) return;
    const cleanName = name.trim();
    const cleanSlug = slugify(slug.trim() || cleanName).slice(0, 80);
    if (!cleanName || !cleanSlug) {
      toast.error("Enter a file name");
      return;
    }
    if (!code.trim()) {
      toast.error("Choose a .lua file first");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("raw_scripts").insert({
        name: cleanName,
        slug: cleanSlug,
        code,
        enabled: true,
        is_protected: false,
        protected_message: "GO PLAY DUM",
      });
      if (error) {
        toast.error(error.code === "23505" ? "That URL name already exists. Change the URL name and try again." : error.message);
        return;
      }
      await adminLog({ adminId: user.id, action: "uploaded Lua file", targetType: "raw_script", details: cleanName });
      toast.success("Lua file uploaded");
      setName("");
      setSlug("");
      setCode("");
      setSelectedFile("");
      if (inputRef.current) inputRef.current.value = "";
      await qc.invalidateQueries({ queryKey: ["raw_scripts"] });
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: LuaFile) {
    if (!user || !confirm(`Delete "${file.name}"? Its raw URL will stop working.`)) return;
    const { error } = await supabase.from("raw_scripts").delete().eq("id", file.id);
    if (error) return toast.error(error.message);
    await adminLog({ adminId: user.id, action: "deleted Lua upload", targetType: "raw_script", details: file.name });
    toast.success("Lua file deleted");
    await qc.invalidateQueries({ queryKey: ["raw_scripts"] });
  }

  async function copyUrl(slugValue: string) {
    try {
      await navigator.clipboard.writeText(rawUrl(slugValue));
      toast.success("Raw URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><FileCode2 size={21} /></span>
          <div>
            <h1 className="font-display text-2xl font-bold">Lua uploads</h1>
            <p className="text-sm text-muted-foreground">Standalone .lua files, separate from the Scripts editor.</p>
          </div>
        </div>
      </div>

      <section className="glass rounded-2xl p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Upload a Lua file</h2>
        <p className="mt-1 text-sm text-muted-foreground">Files are saved to your raw-script library and receive their own raw URL.</p>
        <input ref={inputRef} type="file" accept=".lua,text/plain" className="hidden" onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (file) await uploadFile(file);
          event.currentTarget.value = "";
        }} />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center transition hover:bg-primary/10">
          <FileUp size={24} className="text-primary" />
          <span className="font-semibold">{selectedFile || "Choose .lua file"}</span>
          <span className="text-xs text-muted-foreground">.lua only · maximum 2 MB</span>
        </button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Display name
            <input className="input-base w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Lua script" />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Raw URL name
            <input className="input-base w-full font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-lua-script" />
          </label>
        </div>
        <label className="mt-3 block space-y-1 text-xs font-medium text-muted-foreground">Lua source preview
          <textarea className="input-base w-full font-mono text-xs" rows={10} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Choose a .lua file to load its source here." />
        </label>
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={busy || !code.trim() || !name.trim()} onClick={() => void save()} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            <FileUp size={15} /> {busy ? "Uploading…" : "Upload Lua file"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Uploaded files</h2>
          <span className="chip">{files.data?.length ?? 0} files</span>
        </div>
        {(files.data ?? []).map((file) => (
          <div key={file.id} className="glass flex min-w-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><FileCode2 size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{file.name}</p>
              <p className="truncate font-mono text-xs text-primary">{rawUrl(file.slug)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{file.enabled ? "Enabled" : "Disabled"} · Updated {timeAgo(file.updated_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyUrl(file.slug)} className="btn btn-ghost h-10 !px-3 text-xs"><Copy size={14} /> Copy URL</button>
              <a href={rawUrl(file.slug)} target="_blank" rel="noreferrer" className="btn btn-ghost h-10 !px-3 text-xs"><ExternalLink size={14} /> Open</a>
              <button type="button" title="Delete file" onClick={() => void remove(file)} className="btn btn-ghost h-10 w-10 !p-0 text-destructive"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {files.isLoading && <p className="text-sm text-muted-foreground">Loading uploaded files…</p>}
        {files.error && <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">Could not load uploads: {files.error.message}</p>}
        {files.data && !files.data.length && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No Lua files uploaded yet.</div>}
      </section>
    </div>
  );
}
