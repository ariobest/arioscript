export const THEMES = [
  "midnight", "azure", "cobalt", "cyan", "teal", "emerald", "mint", "lime",
  "amber", "gold", "orange", "ember", "crimson", "rose", "pink", "fuchsia",
  "violet", "purple", "indigo", "slate", "graphite", "ice", "aqua", "neon",
  "matrix", "sunset", "galaxy", "royal", "blood", "mono",
  "coral", "peach", "ruby", "wine", "magenta", "orchid", "lavender", "periwinkle",
  "ocean", "marine", "sky", "lagoon", "forest", "jade", "olive", "citrus",
  "bronze", "copper", "pearl", "silver",
  "sapphire", "electric", "plasma", "arctic", "voltage", "holographic", "toxic", "amethyst", "deepsea", "royalice",
] as const;

export type Theme = (typeof THEMES)[number];

const KEY = "ario-theme";
const MODE_KEY = "ario-mode";
const BACKDROP_KEY = "ario-backdrop";
export type Backdrop = "glow" | "grid" | "plain" | "particles" | "aurora" | "waves" | "matrix";
export function getBackdrop(): Backdrop {
  if (typeof window === "undefined") return "glow";
  const value = localStorage.getItem(BACKDROP_KEY);
  return ["glow", "grid", "plain", "particles", "aurora", "waves", "matrix"].includes(value ?? "") ? value as Backdrop : "glow";
}
export function applyBackdrop(value: Backdrop) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-backdrop", value);
  localStorage.setItem(BACKDROP_KEY, value);
  window.dispatchEvent(new Event("ario-appearance"));
}
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

const MOTION_KEY = "ario-motion";
const ACCENT_KEY = "ario-accent";

export function themeLabel(theme: string) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export function getMotion(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MOTION_KEY) !== "off";
}

export function applyMotion(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-motion", on ? "on" : "off");
  localStorage.setItem(MOTION_KEY, on ? "on" : "off");
}

export function getAccent(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(ACCENT_KEY);
  return v && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}

export function applyAccent(color: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    root.setProperty("--primary", color);
    localStorage.setItem(ACCENT_KEY, color);
  } else {
    root.removeProperty("--primary");
    localStorage.removeItem(ACCENT_KEY);
  }
  window.dispatchEvent(new Event("ario-appearance"));
}

/** Smoothly switch theme with a water-drop ripple from the given point. */
export function switchTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const motion = getMotion() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motion) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 650);
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const drop = document.createElement("span");
    drop.className = "theme-ripple";
    drop.setAttribute("data-theme", theme);
    drop.style.left = `${x}px`;
    drop.style.top = `${y}px`;
    document.body.appendChild(drop);
    window.setTimeout(() => drop.remove(), 900);
  }
  applyTheme(theme);
}

const MSTYLE_KEY = "ario-mobile-style";
export type MobileStyle = "classic" | "cyber";

export function getMobileStyle(): MobileStyle {
  if (typeof window === "undefined") return "cyber";
  return localStorage.getItem(MSTYLE_KEY) === "classic" ? "classic" : "cyber";
}

export function applyMobileStyle(style: MobileStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mobile-style", style);
  localStorage.setItem(MSTYLE_KEY, style);
  window.dispatchEvent(new Event("ario-appearance"));
}
