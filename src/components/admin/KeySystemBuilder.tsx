import { useMemo, useState } from "react";
import {
  Check, ChevronDown, Copy, Eye, Gauge, KeyRound, Link2, Palette, Play,
  Save, Settings2, Sparkles, Timer, Wand2
} from "lucide-react";
import { toast } from "sonner";

const THEMES = ["Ophyn Glass", "ARIO Glass", "Midnight", "Minimal"] as const;
const METHODS = ["GET", "POST"] as const;
const RESPONSES = ["JSON", "Text"] as const;
const STAGES = ["Connecting", "Checking key", "Authorizing", "Ready"] as const;

export function KeySystemBuilder() {
  const [title, setTitle] = useState("ARIO HUB");
  const [subtitle, setSubtitle] = useState("Secure Key System");
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("ARIO Glass");
  const [validator, setValidator] = useState("https://example.com/api/validate");
  const [getKey, setGetKey] = useState("https://example.com/get-key");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("GET");
  const [keyParam, setKeyParam] = useState("key");
  const [response, setResponse] = useState<(typeof RESPONSES)[number]>("JSON");
  const [validField, setValidField] = useState("valid");
  const [successValue, setSuccessValue] = useState("true");
  const [folder, setFolder] = useState("ARIO-KeySystem");
  const [loadingEnabled, setLoadingEnabled] = useState(true);
  const [getKeyEnabled, setGetKeyEnabled] = useState(true);
  const [savedKeyEnabled, setSavedKeyEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [demo, setDemo] = useState(false);
  const [step, setStep] = useState(0);

  const config = useMemo(() => JSON.stringify({
    name: title,
    subtitle,
    theme,
    validation: { url: validator, method, keyParameter: keyParam, response, validField, successValue },
    getKeyUrl: getKey,
    storageFolder: folder,
    features: { loadingAnimation: loadingEnabled, getKeyButton: getKeyEnabled, savedKey: savedKeyEnabled }
  }, null, 2), [title, subtitle, theme, validator, method, keyParam, response, validField, successValue, getKey, folder, loadingEnabled, getKeyEnabled, savedKeyEnabled]);

  function copyConfig() {
    navigator.clipboard.writeText(config).then(() => toast.success("Key-system configuration copied")).catch(() => toast.error("Clipboard access was blocked."));
  }

  function demoLoading() {
    if (demo) return;
    setDemo(true);
    setStep(0);
    let current = 0;
    const id = window.setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= STAGES.length - 1) {
        window.clearInterval(id);
        window.setTimeout(() => setDemo(false), 800);
      }
    }, 650);
  }

  const progress = demo ? Math.min(100, Math.round(((step + 1) / STAGES.length) * 100)) : 100;

  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary"><KeyRound size={18}/></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Key System Builder</p><h2 className="font-display font-semibold">Custom validation flow</h2></div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Title<input value={title} onChange={e=>setTitle(e.target.value)} className="input-base mt-1"/></label>
          <label className="text-xs font-semibold text-muted-foreground">Subtitle<input value={subtitle} onChange={e=>setSubtitle(e.target.value)} className="input-base mt-1"/></label>
          <label className="text-xs font-semibold text-muted-foreground">Theme
            <select value={theme} onChange={e=>setTheme(e.target.value as typeof theme)} className="input-base mt-1">{THEMES.map(x=><option key={x}>{x}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Storage folder<input value={folder} onChange={e=>setFolder(e.target.value)} className="input-base mt-1"/></label>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-background/20">
          <button onClick={()=>setSettingsOpen(v=>!v)} className="flex w-full items-center gap-2 p-3 text-left">
            <Settings2 size={15} className="text-primary"/><span className="text-xs font-bold">API & links</span><ChevronDown size={14} className={"ml-auto transition-transform "+(settingsOpen?"rotate-180":"")}/>
          </button>
          {settingsOpen && <div className="grid gap-3 border-t border-border/50 p-3">
            <label className="text-xs font-semibold text-muted-foreground">Custom validator API
              <input value={validator} onChange={e=>setValidator(e.target.value)} className="input-base mt-1" placeholder="https://your-domain/api/validate"/>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Method<select value={method} onChange={e=>setMethod(e.target.value as typeof method)} className="input-base mt-1">{METHODS.map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="text-xs font-semibold text-muted-foreground">Key parameter<input value={keyParam} onChange={e=>setKeyParam(e.target.value)} className="input-base mt-1"/></label>
              <label className="text-xs font-semibold text-muted-foreground">Response type<select value={response} onChange={e=>setResponse(e.target.value as typeof response)} className="input-base mt-1">{RESPONSES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="text-xs font-semibold text-muted-foreground">Valid field<input value={validField} onChange={e=>setValidField(e.target.value)} className="input-base mt-1"/></label>
              <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Expected success value<input value={successValue} onChange={e=>setSuccessValue(e.target.value)} className="input-base mt-1"/></label>
            </div>
            <label className="text-xs font-semibold text-muted-foreground">Custom Get Key URL
              <div className="relative mt-1"><Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={getKey} onChange={e=>setGetKey(e.target.value)} className="input-base !pl-9"/></div>
            </label>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-[10px] text-muted-foreground"><span className="font-semibold text-primary">Request:</span> {method} {validator}{method==="GET" ? "?" + keyParam + "=…" : ""}</div>
          </div>}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={()=>setGetKeyEnabled(v=>!v)} className={"btn "+(getKeyEnabled?"btn-primary":"btn-ghost")}><Link2 size={13}/>Get Key</button>
          <button onClick={()=>setLoadingEnabled(v=>!v)} className={"btn "+(loadingEnabled?"btn-primary":"btn-ghost")}><Timer size={13}/>Loading</button>
          <button onClick={()=>setSavedKeyEnabled(v=>!v)} className={"btn "+(savedKeyEnabled?"btn-primary":"btn-ghost")}><Save size={13}/>Saved Key</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={demoLoading} disabled={demo} className="btn btn-ghost"><Play size={13}/>{demo ? "Running…" : "Preview loading"}</button>
          <button onClick={copyConfig} className="btn btn-primary"><Copy size={13}/>Copy config</button>
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-background/20 p-3">
          <div className="flex items-center gap-2"><Palette size={14} className="text-primary"/><span className="text-xs font-semibold">UI controls</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="rounded-xl bg-background/30 p-2">Primary action <b className="text-foreground">Validate</b></div>
            <div className="rounded-xl bg-background/30 p-2">Secondary <b className="text-foreground">Get Key</b></div>
            <div className="rounded-xl bg-background/30 p-2">Theme <b className="text-foreground">{theme}</b></div>
            <div className="rounded-xl bg-background/30 p-2">Saved key <b className="text-foreground">{savedKeyEnabled ? "On" : "Off"}</b></div>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><MonitorIcon/><div><h2 className="font-display font-semibold">Live key-system preview</h2><p className="text-xs text-muted-foreground">Preview the exact loading experience before exporting the configuration.</p></div></div>

        <div className="mt-4 rounded-[30px] border border-white/10 bg-[#070a12] p-5">
          <div className="mx-auto max-w-sm rounded-[28px] border border-white/10 bg-white/[.045] p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"><Wand2 size={20}/></div>
              <div><p className="font-bold text-white">{title}</p><p className="text-xs text-white/45">{subtitle}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Access key</p>
              <div className="mt-2 flex h-11 items-center rounded-xl border border-white/10 bg-white/[.035] px-3 text-xs text-white/30">ARIO-XXXXXXXX-XXXXXXXX-XXXXXXXX</div>
            </div>
            <button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"><Check size={15}/>{demo ? "Checking…" : "Validate Key"}</button>
            {getKeyEnabled && <button className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[.035] text-xs font-semibold text-white/70">Get Key ↗</button>}
            {loadingEnabled && <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-[10px]"><span className="font-semibold text-primary">{STAGES[Math.min(step, STAGES.length-1)]}</span><span className="text-white/35">{progress}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{width: progress+"%"}}/></div>
              <div className="mt-2 grid grid-cols-4 gap-1">{STAGES.map((s,i)=><div key={s} className={"h-1 rounded-full transition-all "+(demo && i<=step?"bg-primary":"bg-white/10")}/>)}</div>
            </div>}
            {savedKeyEnabled && <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/80"><Check size={11}/>Saved key auto-check enabled</div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-2 text-[9px] text-white/35"><span className="block text-white/60">Validator</span>{method} • {response}</div>
              <div className="rounded-xl border border-white/10 bg-white/[.025] p-2 text-[9px] text-white/35"><span className="block text-white/60">Get Key</span><span className="block truncate">{getKey}</span></div>
            </div>
          </div>
        </div>

        <details className="mt-4 rounded-2xl border border-border/60 bg-background/20 p-3">
          <summary className="cursor-pointer text-xs font-semibold">View generated configuration</summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-[10px] leading-5 text-white/65">{config}</pre>
        </details>
      </section>
    </div>
  );
}

function MonitorIcon() {
  return <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Eye size={16}/></span>;
}
