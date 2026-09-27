export const THEMES = [
  "midnight", "azure", "cobalt", "cyan", "teal", "emerald", "mint", "lime",
  "amber", "gold", "orange", "ember", "crimson", "rose", "pink", "fuchsia",
  "violet", "purple", "indigo", "slate", "graphite", "ice", "aqua", "neon",
  "matrix", "sunset", "galaxy", "royal", "blood", "mono",
  "coral", "peach", "ruby", "wine", "magenta", "orchid", "lavender", "periwinkle",
  "ocean", "marine", "sky", "lagoon", "forest", "jade", "olive", "citrus",
  "bronze", "copper", "pearl", "silver",
] as const;

export type Theme = (typeof THEMES)[number];

const KEY = "ario-theme";
const MODE_KEY = "ario-mode";
export type ColorMode = "dark" | "light";

export function getMode(): ColorMode {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(MODE_KEY) === "light" ? "light" : "dark";
}

export function applyMode(mode: ColorMode, persist = true) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mode", mode);
  if (persist) localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new Event("ario-appearance"));
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "midnight";
  const t = localStorage.getItem(KEY) as Theme | null;
  return t && (THEMES as readonly string[]).includes(t) ? t : "midnight";
}

export function applyTheme(theme: Theme, persist = true) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  if (persist) localStorage.setItem(KEY, theme);
  window.dispatchEvent(new Event("ario-appearance"));
}
