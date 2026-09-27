import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Rocket, X, Moon, Sun, ArrowRight } from "lucide-react";
import { THEMES, applyMode, applyTheme, getMode, getTheme, type ColorMode, type Theme } from "@/lib/theme";

export function Welcome() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>("dark");
  const [theme, setTheme] = useState<Theme>("midnight");
  useEffect(() => {
    if (!localStorage.getItem("ario-welcomed")) { setOpen(true); setMode(getMode()); setTheme(getTheme()); }
  }, []);
  function done() { localStorage.setItem("ario-welcomed", "1"); setOpen(false); }
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Welcome to ARIO SCRIPTS">
    <div className="relative my-auto w-full max-w-lg py-8 text-center">
      <button title="Close welcome" className="btn btn-ghost absolute right-0 top-0 !p-2" onClick={done}><X size={18} /></button>
      <div className="welcome-rocket mx-auto mb-8 grid h-24 w-24 place-items-center rounded-full bg-primary/15 text-primary glow-ring"><Rocket size={44} strokeWidth={1.5} /></div>
      <p className="text-xs font-semibold uppercase text-primary">Welcome aboard</p>
      <h2 className="mt-2 font-display text-3xl font-bold">ARIO SCRIPTS</h2>
      <p className="mt-2 text-sm text-muted-foreground">Make it yours.</p>
      <div className="mt-8 text-left">
        <p className="mb-2 text-sm font-semibold">Appearance</p>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map(v => <button key={v} className={`btn flex-1 ${mode === v ? "btn-primary" : "btn-ghost"}`} onClick={() => { setMode(v); applyMode(v); }}>{v === "dark" ? <Moon size={16} /> : <Sun size={16} />}{v === "dark" ? "Dark" : "Light"}</button>)}
        </div>
        <label className="mt-5 block text-sm font-semibold" htmlFor="welcome-theme">Theme</label>
        <select id="welcome-theme" className="input-base mt-2 capitalize" value={theme} onChange={e => { const t = e.target.value as Theme; setTheme(t); applyTheme(t); }}>{THEMES.map(t => <option key={t} value={t} className="bg-background capitalize">{t}</option>)}</select>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to="/auth" onClick={done} className="btn btn-primary">Sign in <ArrowRight size={15} /></Link>
        <button className="btn btn-ghost" onClick={done}>Explore scripts</button>
      </div>
    </div>
  </div>;
}
