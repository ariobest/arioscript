import { useEffect, useRef, useState } from "react";
import { Palette, Check, Sun, Moon } from "lucide-react";
import { Volume2, VolumeX } from "lucide-react";
import { soundsEnabled, setSoundsEnabled } from "@/lib/sounds";
import { toast } from "sonner";
import { THEMES, applyTheme, getTheme, applyMode, getMode, switchTheme, themeLabel, applyBackdrop, getBackdrop, type Backdrop, type Theme, type ColorMode } from "@/lib/theme";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("midnight");
  const [mode, setMode] = useState<ColorMode>("dark");
  const [backdrop, setBackdrop] = useState<Backdrop>("glow");
  const [soundOn, setSoundOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = getTheme();
    setTheme(t);
    applyTheme(t, false);
    setMode(getMode());
    setBackdrop(getBackdrop());
    setSoundOn(soundsEnabled());
    const sync = () => { setTheme(getTheme()); setMode(getMode()); setBackdrop(getBackdrop()); setSoundOn(soundsEnabled()); };
    window.addEventListener("ario-appearance", sync);
    return () => window.removeEventListener("ario-appearance", sync);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Change theme"
        onClick={() => setOpen((v) => !v)}
         aria-expanded={open}
         className="btn btn-ghost h-9 w-9 !p-0"
      >
        <Palette size={16} />
      </button>
      {open && (
        <div className="glass appearance-panel fade-up fixed inset-x-4 top-16 z-50 rounded-2xl p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64">
          <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-secondary p-1">
            {(["dark", "light"] as const).map((value) => <button key={value} onClick={() => { setMode(value); applyMode(value); }} className={`btn flex-1 !py-1.5 capitalize ${mode === value ? "btn-primary" : "btn-ghost"}`}>{value === "dark" ? <Moon size={13} /> : <Sun size={13} />}{value}</button>)}
          </div>
          <p className="mb-1 px-1 text-xs font-semibold text-muted-foreground">Background</p>
          <div className="mb-3 flex gap-1 rounded-lg bg-secondary p-1">
            {(["glow", "grid", "particles", "aurora", "waves", "matrix", "plain"] as const).map(value => <button key={value} onClick={() => { setBackdrop(value); applyBackdrop(value); }} className={`btn min-w-0 !px-1 !py-1.5 text-xs capitalize ${backdrop === value ? "btn-primary" : "btn-ghost"}`}>{value}</button>)}
          </div>
          <button onClick={() => { setSoundsEnabled(!soundOn); setSoundOn(!soundOn); }} className="btn btn-ghost mb-3 w-full justify-start text-xs" aria-label={soundOn ? "Mute UI sounds" : "Enable UI sounds"}>{soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />} UI sounds {soundOn ? "on" : "off"}</button>
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">50 themes</p>
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  setTheme(t);
                  switchTheme(t, { x: e.clientX, y: e.clientY });
                  toast(`💧 ${themeLabel(t)} Theme enabled`);
                }}
                data-theme={t}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs capitalize transition-colors hover:bg-secondary"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-primary ring-1 ring-border" />
                <span className="flex-1 truncate text-foreground">{t}</span>
                {theme === t && <Check size={12} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
