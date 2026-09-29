import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Moon, Sun, Sparkles, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/components/site/Layout";
import {
  THEMES, getTheme, switchTheme, themeLabel, getMode, applyMode, getMotion, applyMotion,
  getAccent, applyAccent, type Theme, type ColorMode,
} from "@/lib/theme";
import { logAdmin } from "@/lib/adminLog";

export const Route = createFileRoute("/admin/themes")({
  head: () => ({ meta: [{ title: "Theme Manager — ARIO SCRIPTS" }, { name: "description", content: "Preview and manage ARIO SCRIPTS themes, colors and animations." }, { property: "og:title", content: "Theme Manager — ARIO SCRIPTS" }, { property: "og:description", content: "Preview and manage ARIO SCRIPTS themes, colors and animations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ThemesAdmin,
});

function ThemesAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [theme, setTheme] = useState<Theme>("midnight");
  const [mode, setMode] = useState<ColorMode>("dark");
  const [motion, setMotion] = useState(true);
  const [accent, setAccent] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTheme(getTheme()); setMode(getMode()); setMotion(getMotion()); setAccent(getAccent()); }, []);

  const list = useMemo(() => THEMES.filter(t => t.includes(filter.toLowerCase().trim())), [filter]);

  function pick(t: Theme, e?: React.MouseEvent) {
    setTheme(t);
    switchTheme(t, e ? { x: e.clientX, y: e.clientY } : undefined);
    toast(`💧 ${themeLabel(t)} Theme enabled`);
  }

  async function saveDefault() {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ theme, color_mode: mode }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("Could not save the site default");
    await logAdmin("changed_settings", "site_settings", "1", { theme, color_mode: mode });
    qc.invalidateQueries({ queryKey: ["site_settings"] });
    toast.success(`${themeLabel(theme)} is now the site default`);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Themes</h1>
          <p className="truncate text-sm text-muted-foreground">Site default: <span className="capitalize text-foreground">{settings?.theme ?? "—"}</span> · {settings?.color_mode ?? "dark"}</p>
        </div>
        <button onClick={saveDefault} disabled={saving} className="btn btn-primary shrink-0"><Save size={15} /><span className="hidden sm:inline">{saving ? "Saving…" : "Set as site default"}</span></button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
          <div className="mt-3 flex gap-1 rounded-lg bg-secondary p-1">
            {(["dark", "light"] as const).map(v => (
              <button key={v} onClick={() => { setMode(v); applyMode(v); }} className={`btn flex-1 !py-1.5 capitalize ${mode === v ? "btn-primary" : "btn-ghost"}`}>{v === "dark" ? <Moon size={13} /> : <Sun size={13} />}{v}</button>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom accent color</p>
          <div className="mt-3 flex items-center gap-2">
            <input type="color" value={accent ?? "#4f7cff"} onChange={e => { setAccent(e.target.value); applyAccent(e.target.value); }} className="h-10 w-14 shrink-0 cursor-pointer rounded border border-border bg-transparent" aria-label="Accent color" />
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{accent ?? "Theme default"}</span>
            <button onClick={() => { setAccent(null); applyAccent(null); }} className="btn btn-ghost h-9 w-9 !p-0" aria-label="Reset accent"><RotateCcw size={14} /></button>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Animations</p>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><Sparkles size={15} className="text-primary" /> Ripples & transitions</span>
            <input type="checkbox" checked={motion} onChange={e => { setMotion(e.target.checked); applyMotion(e.target.checked); toast(e.target.checked ? "Animations on" : "Animations off"); }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Accent and animation settings apply to this device.</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={`Search ${THEMES.length} themes…`} className="input-base !pl-9" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map(t => (
          <button key={t} onClick={e => pick(t, e)} data-theme={t} className={`group overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${theme === t ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
            <div className="relative h-20 bg-background p-2">
              <div className="h-2 w-10 rounded-full bg-primary" />
              <div className="mt-2 h-2 w-16 rounded-full bg-muted" />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <span className="h-5 w-5 rounded-full bg-primary" />
                <span className="h-5 w-5 rounded-full bg-accent" />
                <span className="h-5 w-5 rounded-full bg-secondary ring-1 ring-border" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
              <span className="truncate text-sm capitalize text-foreground">{t}</span>
              {theme === t && <Check size={14} className="shrink-0 text-primary" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
