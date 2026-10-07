import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot, Check, Code2, Copy, FileCode2, Filter, Layers3, Loader2, Search, Sparkles, Wand2,
  Activity, AlarmClock, Archive, BadgeCheck, Bell, Box, Braces, Bug, Calendar, ChartNoAxesCombined,
  CircleHelp, Cloud, Database, Eye, Gauge, Github, Globe, Heart, KeyRound, LayoutDashboard,
  Lock, Monitor, Moon, Package, Palette, Play, Rocket, Save, Settings, Shield, SlidersHorizontal,
  Terminal, Trash2, User, Users, Zap
} from "lucide-react";
import { toast } from "sonner";
import { generateScript } from "@/lib/assistant.functions";
import { CodeViewer } from "@/components/site/CodeViewer";
import { KeySystemStudio } from "@/components/admin/KeySystemStudio";

export const Route = createFileRoute("/admin/studio")({
  head: () => ({
    meta: [
      { title: "Developer Studio — ARIO SCRIPTS" },
      { name: "description", content: "ARIA developer studio with an icon picker and AI Roblox Lua generator." },
    ],
  }),
  component: Studio,
});

type IconEntry = { name: string; icon: React.ElementType };
const ICONS: IconEntry[] = [
  ["Activity", Activity], ["AlarmClock", AlarmClock], ["Archive", Archive], ["BadgeCheck", BadgeCheck],
  ["Bell", Bell], ["Bot", Bot], ["Box", Box], ["Braces", Braces], ["Bug", Bug], ["Calendar", Calendar],
  ["ChartNoAxesCombined", ChartNoAxesCombined], ["CircleHelp", CircleHelp], ["Cloud", Cloud], ["Code2", Code2],
  ["Copy", Copy], ["Database", Database], ["Eye", Eye], ["FileCode2", FileCode2], ["Filter", Filter],
  ["Gauge", Gauge], ["Github", Github], ["Globe", Globe], ["Heart", Heart], ["KeyRound", KeyRound],
  ["LayoutDashboard", LayoutDashboard], ["Layers3", Layers3], ["Lock", Lock], ["Monitor", Monitor],
  ["Moon", Moon], ["Package", Package], ["Palette", Palette], ["Play", Play], ["Rocket", Rocket],
  ["Save", Save], ["Search", Search], ["Settings", Settings], ["Shield", Shield], ["SlidersHorizontal", SlidersHorizontal],
  ["Sparkles", Sparkles], ["Terminal", Terminal], ["Trash2", Trash2], ["User", User], ["Users", Users],
  ["Wand2", Wand2], ["Zap", Zap],
];

const MODELS = [
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-opus-4-1", label: "Claude Opus 4.1" },
] as const;

const LIBRARIES = ["windui", "rayfield", "orion"] as const;

function copyText(value: string, message = "Copied to clipboard") {
  navigator.clipboard.writeText(value).then(() => toast.success(message)).catch(() => toast.error("Clipboard access was blocked."));
}

function Studio() {
  const [iconSearch, setIconSearch] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Sparkles");
  const [iconSize, setIconSize] = useState(18);
  const [stroke, setStroke] = useState(2);
  const [model, setModel] = useState<(typeof MODELS)[number]["id"]>("anthropic/claude-sonnet-4-5");
  const [library, setLibrary] = useState<(typeof LIBRARIES)[number]>("windui");
  const [prompt, setPrompt] = useState("");
  const [panel, setPanel] = useState<"icons" | "script" | "key">("script");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const ask = useServerFn(generateScript);

  const filtered = useMemo(
    () => ICONS.filter(i => i.name.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 48),
    [iconSearch]
  );
  const CurrentIcon = ICONS.find(i => i.name === selectedIcon)?.icon ?? Sparkles;
  const snippet = `import { ${selectedIcon} } from "lucide-react";\n\n<${selectedIcon} size={${iconSize}} strokeWidth={${stroke}} />`;

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const result = await ask({
        data: {
          messages: [{ role: "user", content: prompt.trim() }],
          model,
          library,
        },
      });
      const match = result.text.match(/```(?:lua)?\n([\s\S]*?)```/);
      setCode((match?.[1] ?? result.text).trim());
      toast.success("Lua script generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The model could not generate the script.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring"><Code2 size={21} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">ARIO Developer Studio</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Build faster.</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A private admin-only workspace for Lucide icons and AI-assisted Roblox Lua generation.</p>
          </div>
        </div>
      </header>

      <div className="glass flex flex-wrap gap-2 rounded-2xl p-2">
        <button onClick={() => setPanel("script")} className={"btn " + (panel === "script" ? "btn-primary" : "btn-ghost")}><Sparkles size={14}/> Script maker</button>
        <button onClick={() => setPanel("key")} className={"btn " + (panel === "key" ? "btn-primary" : "btn-ghost")}><KeyRound size={14}/> Key system maker</button>
        <button onClick={() => setPanel("icons")} className={"btn " + (panel === "icons" ? "btn-primary" : "btn-ghost")}><Palette size={14}/> Icon studio</button>
      </div>

      {panel === "key" && <KeySystemStudio />}
      {panel !== "key" && <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        {panel === "icons" && <section className="glass rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Palette size={16} /></span>
            <div><h2 className="font-display font-semibold">Icon studio</h2><p className="text-xs text-muted-foreground">Pick an icon and copy ready-to-use code.</p></div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={iconSearch} onChange={e => setIconSearch(e.target.value)} placeholder="Search 45+ icons…" className="input-base !pl-9" /></div>
            <button className="btn btn-ghost" onClick={() => copyText(snippet, "Icon snippet copied")}><Copy size={14} /> Copy</button>
          </div>
          <div className="mt-4 grid max-h-[360px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
            {filtered.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setSelectedIcon(name)} className={`group rounded-2xl border p-3 text-center transition-all ${selectedIcon === name ? "border-primary/50 bg-primary/12 text-primary shadow-[0_0_24px_-10px_hsl(var(--primary)/.8)]" : "border-border/60 bg-background/20 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                <Icon size={20} className="mx-auto transition-transform group-hover:scale-110" />
                <span className="mt-2 block truncate text-[10px] font-semibold">{name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-muted-foreground">Size: {iconSize}px<input type="range" min="12" max="48" value={iconSize} onChange={e => setIconSize(Number(e.target.value))} className="mt-2 w-full" /></label>
            <label className="text-xs font-semibold text-muted-foreground">Stroke: {stroke}<input type="range" min="1" max="4" step=".5" value={stroke} onChange={e => setStroke(Number(e.target.value))} className="mt-2 w-full" /></label>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/25 p-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><CurrentIcon size={iconSize} strokeWidth={stroke} /></span>
            <div className="min-w-0"><p className="font-semibold">{selectedIcon}</p><code className="block truncate text-xs text-muted-foreground">{snippet}</code></div>
          </div>
        </section>}

        {panel === "script" && <section className="glass rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Bot size={16} /></span>
            <div><h2 className="font-display font-semibold">Roblox Lua maker</h2><p className="text-xs text-muted-foreground">Choose a real model and UI library, then describe the script.</p></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">Model<select value={model} onChange={e => setModel(e.target.value as typeof model)} className="input-base mt-1">{MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <label className="text-xs font-semibold text-muted-foreground">Library<select value={library} onChange={e => setLibrary(e.target.value as typeof library)} className="input-base mt-1">{LIBRARIES.map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}</select></label>
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7} className="input-base mt-3 min-h-40 resize-y" placeholder="Describe exactly what the Roblox Lua script should do. Example: Make a clean WindUI hub with tabs for movement and visuals, a speed slider, a jump toggle, notifications, config saving, and safe cleanup." />
          <div className="mt-3 flex flex-wrap gap-2">
            {["WindUI hub with tabs", "ESP with settings", "Teleport menu", "Movement controls"].map(p => <button key={p} onClick={() => setPrompt(p)} className="chip text-xs">{p}</button>)}
          </div>
          <button onClick={() => void generate()} disabled={busy || !prompt.trim()} className="btn btn-primary mt-4 w-full disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? "Generating with AI…" : "Generate Lua"}
          </button>
          {code && <div className="mt-4"><CodeViewer code={code} filename={`ario-${library}-generated.lua`} /></div>}
        </section>}
      </div>}
    </div>
  );
}
