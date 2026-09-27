export const THEMES = [
  "midnight", "azure", "cobalt", "cyan", "teal", "emerald", "mint", "lime",
  "amber", "gold", "orange", "ember", "crimson", "rose", "pink", "fuchsia",
  "violet", "purple", "indigo", "slate", "graphite", "ice", "aqua", "neon",
  "matrix", "sunset", "galaxy", "royal", "blood", "mono",
] as const;

export type Theme = (typeof THEMES)[number];

const KEY = "ario-theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "midnight";
  const t = localStorage.getItem(KEY) as Theme | null;
  return t && (THEMES as readonly string[]).includes(t) ? t : "midnight";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(KEY, theme);
}
