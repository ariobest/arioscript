import { supabase } from "@/integrations/supabase/client";
import type { Script, SiteStats } from "@/lib/types";

export const SCRIPT_SELECT = "*, categories(name, slug)";

export async function listScripts(opts: {
  sort?: string;
  limit?: number;
  featured?: boolean;
  category?: string;
  game?: string;
  q?: string;
  workingOnly?: boolean;
}): Promise<Script[]> {
  let query = supabase
    .from("scripts")
    .select(SCRIPT_SELECT)
    .eq("published", true)
    .eq("archived", false);

  if (opts.featured) query = query.eq("featured", true);
  if (opts.workingOnly) query = query.eq("status", "working");
  if (opts.game) query = query.eq("game_name", opts.game);
  if (opts.q) {
    const term = opts.q.replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,game_name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const sortMap: Record<string, string> = {
    newest: "created_at",
    views: "views",
    downloads: "downloads",
    copies: "copies",
    favorites: "favorites",
  };
  query = query.order(sortMap[opts.sort ?? "newest"] ?? "created_at", { ascending: false });
  query = query.limit(opts.limit ?? 24);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Script[];
  if (opts.category) rows = rows.filter((r) => r.categories?.slug === opts.category);
  if (opts.q) {
    const t = opts.q.toLowerCase();
    const tagMatches = rows.filter((r) => r.tags?.some((tag) => tag.toLowerCase().includes(t)));
    rows = Array.from(new Set([...rows, ...tagMatches]));
  }
  return rows;
}

export async function getStats(): Promise<SiteStats> {
  const { data, error } = await supabase.rpc("site_stats");
  if (error) throw error;
  return data as unknown as SiteStats;
}

export async function getTrending(limit = 8): Promise<Script[]> {
  const { data, error } = await supabase.rpc("trending_scripts", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as unknown as Script[];
}

export async function getCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getGames() {
  const { data, error } = await supabase
    .from("scripts")
    .select("game_name, image_url, views")
    .eq("published", true)
    .eq("archived", false);
  if (error) throw error;
  const map = new Map<string, { game: string; count: number; image: string | null; views: number }>();
  for (const row of data ?? []) {
    const e = map.get(row.game_name) ?? { game: row.game_name, count: 0, image: null, views: 0 };
    e.count += 1;
    e.views += row.views ?? 0;
    e.image = e.image ?? row.image_url;
    map.set(row.game_name, e);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
