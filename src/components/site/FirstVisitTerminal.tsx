import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Terminal, X, Palette, UserPlus, ArrowRight } from "lucide-react";
import { THEMES, applyTheme, themeLabel, type Theme } from "@/lib/theme";

const THEME_SWATCHES: Record<string, string> = { midnight: "#64748b", royal: "#4169e1", azure: "#1687ff", cobalt: "#2455d6", emerald: "#10b981", rose: "#f43f5e", violet: "#8b5cf6", matrix: "#39ff14", cyan: "#06b6d4", crimson: "#dc2626", gold: "#f59e0b", galaxy: "#7c3aed", arctic: "#7dd3fc", ocean: "#0284c7", plasma: "#d946ef", pearl: "#e5e7eb" };

const INTRO_LINES = [
  "ARIO SCRIPTS :: INITIALIZING...",
  "Welcome to your script workspace.",
  "Create an account to save favorites and manage your keys.",
  "Choose a theme to customize your experience.",
];

export function FirstVisitTerminal() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState("");
  const [theme, setTheme] = useState<Theme>("midnight");
  const [themeOpen, setThemeOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("ario-first-visit-terminal-dismissed") !== "1") {
        setVisible(true);
      }
    } catch { /* local storage may be unavailable */ }
  }, []);

  useEffect(() => {
    if (!visible || line >= INTRO_LINES.length) return;
    const current = INTRO_LINES[line];
    if (typed.length < current.length) {
      const timer = window.setTimeout(() => setTyped(current.slice(0, typed.length + 1)), line === 0 ? 24 : 13);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => { setLine(v => v + 1); setTyped(""); }, 240);
    return () => window.clearTimeout(timer);
  }, [visible, line, typed]);

  function dismiss() {
    try { localStorage.setItem("ario-first-visit-terminal-dismissed", "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ario-first-terminal-title">
      <section className="ario-first-terminal my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-400/30 bg-[#070d12]/95 shadow-[0_25px_100px_rgba(0,0,0,.65)]">
        <header className="flex items-center gap-2 border-b border-emerald-400/20 bg-white/[0.04] px-4 py-3">
          <Terminal size={17} className="text-emerald-300" />
          <span id="ario-first-terminal-title" className="min-w-0 flex-1 truncate font-mono text-xs font-semibold tracking-wide text-emerald-200">ario@welcome:~</span>
          <span className="hidden text-[10px] text-emerald-100/50 sm:inline">FIRST RUN</span>
          <button onClick={dismiss} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close welcome terminal"><X size={16} /></button>
        </header>
        <div className="p-4 font-mono text-[12px] leading-6 sm:p-6 sm:text-sm">
          <div className="mb-4 space-y-1 text-emerald-300/90" aria-live="polite">
            {INTRO_LINES.slice(0, line).map((text, i) => <p key={text} className={i === 0 ? "text-emerald-200" : ""}><span className="mr-2 text-emerald-500">$</span>{text}</p>)}
            {line < INTRO_LINES.length && <p className="break-words"><span className="mr-2 text-emerald-500">$</span>{typed}<span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-300 align-middle" /></p>}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2 text-white/80"><Palette size={15} className="text-emerald-300" /> <span>Choose your theme</span></div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(["midnight", "royal", "azure", "cobalt", "emerald", "rose", "violet", "matrix"] as Theme[]).map(t => (
                <button key={t} onClick={() => { setTheme(t); applyTheme(t); }} className={`min-w-0 rounded-lg border px-2 py-2 text-[11px] capitalize transition-colors sm:text-xs ${theme === t ? "border-emerald-300 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10"}`}>
                  <span className="mx-auto mb-1 block h-3 w-8 max-w-full rounded-full border border-white/20 shadow-[0_0_12px_var(--swatch-color)]" style={{ "--swatch-color": THEME_SWATCHES[t] ?? "#64748b", backgroundColor: THEME_SWATCHES[t] ?? "#64748b" } as React.CSSProperties} />{themeLabel(t)}
                </button>
              ))}
            </div>
            <button onClick={() => setThemeOpen(v => !v)} className="mt-2 text-[11px] text-emerald-200/80 underline underline-offset-4">{themeOpen ? "Show fewer themes" : "More themes…"}</button>
            {themeOpen && <div className="mt-2 grid max-h-36 grid-cols-3 gap-1 overflow-y-auto pr-1 sm:grid-cols-4">{THEMES.filter(t => !["midnight", "royal", "azure", "cobalt", "emerald", "rose", "violet", "matrix"].includes(t)).map(t => <button key={t} onClick={() => { setTheme(t); applyTheme(t); }} className={`min-w-0 rounded-md border px-2 py-2 text-[11px] capitalize ${theme === t ? "border-emerald-300 bg-white/10 text-white" : "border-white/10 text-white/70 hover:bg-white/10"}`}><span className="mx-auto mb-1 block h-2.5 w-7 rounded-full border border-white/20" style={{ backgroundColor: THEME_SWATCHES[t] ?? "#64748b" }} />{themeLabel(t)}</button>)}</div>}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={() => { dismiss(); navigate({ to: "/auth" }); }} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-sans text-sm font-bold text-[#07100d] transition hover:bg-emerald-200"><UserPlus size={16} /> Sign up / Sign in <ArrowRight size={15} /></button>
            <button onClick={dismiss} className="min-h-11 rounded-xl border border-white/15 px-4 py-3 font-sans text-sm text-white/75 transition hover:bg-white/10">Later — explore first</button>
          </div>
          <p className="mt-3 text-center font-sans text-[10px] text-white/40">Your theme is saved on this device. You can change it anytime.</p>
        </div>
      </section>
    </div>
  );
}
