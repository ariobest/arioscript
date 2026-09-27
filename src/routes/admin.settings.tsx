import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { getCategories } from "@/lib/queries";
import { slugify } from "@/lib/format";
import { THEMES, applyTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Settings = {
  site_name: string; description: string; logo_url: string | null; favicon_url: string | null;
  discord_url: string | null; youtube_url: string | null; telegram_url: string | null; support_url: string | null;
  theme: string; maintenance_mode: boolean; registration_enabled: boolean;
};

function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [newCat, setNewCat] = useState("");

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
    const { error } = await supabase.from("site_settings").update({ ...form, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "changed settings", targetType: "settings" });
    applyTheme(form.theme as never);
    toast.success("Settings saved");
    void qc.invalidateQueries({ queryKey: ["site_settings"] });
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), slug: slugify(newCat) });
    if (error) return toast.error(error.message);
    setNewCat("");
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
          <button onClick={() => void addCategory()} className="btn btn-primary"><Plus size={15} /></button>
        </div>
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
