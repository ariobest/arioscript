import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { getCategories } from "@/lib/queries";
import { slugify } from "@/lib/format";
import { THEMES, applyTheme, applyMode } from "@/lib/theme";
import { uploadSiteImage } from "@/lib/media";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: 'Site Settings — ARIO SCRIPTS' }, { name: "description", content: 'Control ARIO SCRIPTS appearance and site settings.' }, { property: "og:title", content: 'Site Settings — ARIO SCRIPTS' }, { property: "og:description", content: 'Control ARIO SCRIPTS appearance and site settings.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminSettings,
});

type Settings = {
  site_name: string; description: string; logo_url: string | null; favicon_url: string | null;
  discord_url: string | null; youtube_url: string | null; telegram_url: string | null; support_url: string | null;
  theme: string; maintenance_mode: boolean; registration_enabled: boolean;
  color_mode: string; background_color: string | null; hero_image_url: string | null;
  homepage_sections: string[]; custom_css: string | null; other_social_url: string | null;
};

function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catIcon, setCatIcon] = useState("Shapes");
  const [catImage, setCatImage] = useState("");

  async function uploadImage(file: File, key: "logo_url" | "favicon_url" | "hero_image_url" | "category") {
    try {
      const url = await uploadSiteImage(file);
      if (key === "category") setCatImage(url);
      else setForm((current) => current ? { ...current, [key]: url } : current);
      toast.success("Image uploaded. Save settings to publish it.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
  }

  const settings = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data as unknown as Settings);
  }, [settings.data, form]);

  async function save() {
    if (!form) return;
    if (form.custom_css && form.custom_css.length > 10000) return toast.error("Custom CSS must be under 10,000 characters");
    if (form.background_color && !/^#[0-9a-f]{6}$/i.test(form.background_color)) return toast.error("Choose a valid background color");
    const { error } = await supabase.from("site_settings").update({ ...form, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "changed settings", targetType: "settings" });
    applyTheme(form.theme as never);
    applyMode(form.color_mode === "light" ? "light" : "dark");
    toast.success("Settings saved");
    void qc.invalidateQueries({ queryKey: ["site_settings"] });
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), slug: slugify(newCat), icon: catIcon.trim() || "Shapes", image_url: catImage || null });
    if (error) return toast.error(error.message);
    setNewCat("");
    setCatImage("");
    void qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function removeCategory(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["categories"] });
  }

  if (!form) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  const fields: [keyof Settings, string][] = [
    ["site_name", "Site name"],
    ["description", "Description"],
    ["logo_url", "Logo URL"],
    ["favicon_url", "Favicon URL"],
    ["discord_url", "Discord URL"],
    ["youtube_url", "YouTube URL"],
    ["telegram_url", "Telegram URL"],
    ["support_url", "Support URL"],
    ["other_social_url", "Other social URL"],
    ["hero_image_url", "Hero image URL"],
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Site settings</h1>

      <div className="glass grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <label key={key} className="text-xs text-muted-foreground">
            {label}
            <input
              className="input-base mt-1"
              value={(form[key] as string) ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}

        <label className="text-xs text-muted-foreground">
          Default accent theme
          <select className="input-base mt-1" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            {THEMES.map((t) => <option key={t} value={t} className="bg-background capitalize">{t}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Default mode
          <select className="input-base mt-1" value={form.color_mode ?? "dark"} onChange={(e) => setForm({ ...form, color_mode: e.target.value })}><option value="dark">Dark</option><option value="light">Light</option></select>
        </label>
        <label className="text-xs text-muted-foreground">Background color
          <input type="color" className="mt-1 block h-10 w-20 cursor-pointer rounded border border-border" value={form.background_color || "#181a24"} onChange={(e) => setForm({ ...form, background_color: e.target.value })} />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">{(["logo_url", "favicon_url", "hero_image_url"] as const).map((key) => <label key={key} className="btn btn-ghost cursor-pointer text-xs"><Upload size={14} /> Upload {key.replace("_url", "").replace("_", " ")}<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], key)} /></label>)}</div>
        <div className="sm:col-span-2"><p className="mb-2 text-xs text-muted-foreground">Homepage sections</p><div className="flex flex-wrap gap-3 text-xs">{(["featured", "trending", "recent", "downloads", "views", "copies", "games", "categories"] as const).map((section) => <label key={section} className="flex items-center gap-1.5 capitalize"><input type="checkbox" checked={(form.homepage_sections ?? []).includes(section)} onChange={(e) => setForm({ ...form, homepage_sections: e.target.checked ? [...(form.homepage_sections ?? []), section] : (form.homepage_sections ?? []).filter((s) => s !== section) })} />{section}</label>)}</div></div>
        <label className="text-xs text-muted-foreground sm:col-span-2">Custom CSS (admin only)
          <textarea className="input-base mt-1 font-mono text-xs" rows={4} maxLength={10000} value={form.custom_css ?? ""} onChange={(e) => setForm({ ...form, custom_css: e.target.value })} />
        </label>

        <div className="flex items-end gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.maintenance_mode} onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            Maintenance mode
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.registration_enabled} onChange={(e) => setForm({ ...form, registration_enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            Registration enabled
          </label>
        </div>

        <div className="sm:col-span-2">
          <button onClick={() => void save()} className="btn btn-primary"><Save size={15} /> Save settings</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold">Categories</h2>
        <div className="mt-3 flex gap-2">
          <input className="input-base" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <input className="input-base" placeholder="Lucide icon name" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} />
          <button onClick={() => void addCategory()} className="btn btn-primary"><Plus size={15} /></button>
        </div>
        <div className="mt-2 flex items-center gap-2"><input className="input-base" placeholder="Category image URL" value={catImage} onChange={(e) => setCatImage(e.target.value)} /><label className="btn btn-ghost cursor-pointer"><Upload size={14} /><input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], "category")} /></label></div>
        <ul className="mt-3 space-y-1">
          {(categories.data ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-secondary">
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-muted-foreground">/{c.slug}</span>
              <button onClick={() => void removeCategory(c.id)} className="btn btn-ghost !p-1.5 text-destructive"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
