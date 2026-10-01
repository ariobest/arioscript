import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Rocket, X, Moon, Sun, ArrowRight, Sparkles, Terminal } from "lucide-react";
import { THEMES, applyMode, applyTheme, switchTheme, getMode, getTheme, type ColorMode, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function Welcome() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>("dark");
  const [theme, setTheme] = useState<Theme>("midnight");
  useEffect(() => {
    if (!localStorage.getItem("ario-welcomed")) { setOpen(true); setMode(getMode()); setTheme(getTheme()); }
  }, []);
  function done() { localStorage.setItem("ario-welcomed", "1"); setOpen(false); }
  if (!open) return null;
  return <div className="welcome-overlay fixed inset-0 z-[90] overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label="Welcome to ARIO SCRIPTS">
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-10 pt-5 sm:px-8 sm:pb-14 sm:pt-8">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
        <span className="flex items-center gap-2 font-display text-sm font-bold"><Terminal size={19} className="text-primary" /> ARIO SCRIPTS</span>
        <Button title="Close welcome" aria-label="Close welcome" variant="ghost" size="icon" onClick={done}><X size={18} /></Button>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-7 text-center sm:py-10">
        <div className="welcome-flight welcome-shake relative mx-auto mb-5 flex h-40 w-full max-w-sm items-center justify-center overflow-hidden sm:mb-8 sm:h-52" aria-hidden="true">
          <div className="welcome-orbit welcome-orbit-outer" /><div className="welcome-orbit welcome-orbit-inner" />
          <div className="welcome-star welcome-star-one" /><div className="welcome-star welcome-star-two" /><div className="welcome-star welcome-star-three" /><div className="welcome-star welcome-star-four" />
          <div className="welcome-particle" style={{ left: "42%", top: "70%" }} />
          <div className="welcome-particle" style={{ left: "55%", top: "74%", animationDelay: ".4s" }} />
          <div className="welcome-particle" style={{ left: "48%", top: "78%", animationDelay: ".8s" }} />
          <div className="welcome-particle" style={{ left: "60%", top: "68%", animationDelay: "1.1s" }} />
          <div className="welcome-count">3·2·1</div>
          <div className="welcome-launch-trail" />
          <div className="welcome-flame" />
          <div className="welcome-rocket"><Rocket size={64} strokeWidth={1.25} className="drop-shadow-lg sm:h-20 sm:w-20" /></div>
          <div className="welcome-arrival"><Sparkles size={15} /> READY FOR LAUNCH</div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Welcome aboard</p>
        <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">ARIO SCRIPTS</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your next discovery starts here.</p>
        <div className="mt-7 grid gap-4 border-t border-border pt-6 text-left sm:mt-9 sm:grid-cols-[1fr_1fr] sm:items-end">
          <div><p className="mb-2 text-sm font-semibold">Appearance</p><div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map(v => <Button key={v} variant={mode === v ? "default" : "outline"} className="w-full" onClick={() => { setMode(v); applyMode(v); }}>{v === "dark" ? <Moon size={16} /> : <Sun size={16} />}{v === "dark" ? "Dark" : "Light"}</Button>)}
          </div></div>
          <div><label className="mb-2 block text-sm font-semibold" htmlFor="welcome-theme">Theme</label>
            <select id="welcome-theme" className="input-base capitalize" value={theme} onChange={e => { const t = e.target.value as Theme; setTheme(t); switchTheme(t); }}>{THEMES.map(t => <option key={t} value={t} className="bg-background capitalize">{t}</option>)}</select>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
          <Link to="/auth" onClick={done} className="btn btn-primary min-w-0">Sign in <ArrowRight size={15} /></Link>
          <Button variant="outline" className="min-w-0" onClick={done}>Explore scripts</Button>
        </div>
      </div>
    </div>
  </div>;
}
