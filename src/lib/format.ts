export function compact(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return (v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, "") + "K";
  return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  const units: [number, string][] = [
    [60, "s"], [3600, "m"], [86400, "h"], [604800, "d"], [2592000, "w"], [31536000, "mo"],
  ];
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w ago`;
  void units;
  return new Date(date).toLocaleDateString();
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}
