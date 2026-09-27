import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEMES, applyTheme, getTheme, type Theme } from "@/lib/theme";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("midnight");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = getTheme();
    setTheme(t);
    applyTheme(t);
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
        className="btn btn-ghost h-9 w-9 !p-0"
      >
        <Palette size={16} />
      </button>
      {open && (
        <div className="glass fade-up absolute right-0 z-50 mt-2 w-64 rounded-2xl p-3">
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">30 themes</p>
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto pr-1">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  applyTheme(t);
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
