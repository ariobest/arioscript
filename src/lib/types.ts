export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

export type Script = {
  id: string;
  name: string;
  slug: string;
  game_name: string;
  description: string | null;
  category_id: string | null;
  code: string;
  image_url: string | null;
  youtube_url: string | null;
  tags: string[];
  version: string;
  status: string;
  published: boolean;
  archived: boolean;
  featured: boolean;
  verified: boolean;
  download_enabled: boolean;
  views: number;
  downloads: number;
  copies: number;
  shares: number;
  favorites: number;
  created_at: string;
  updated_at: string;
  categories?: { name: string; slug: string } | null;
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
};

export type SiteStats = {
  scripts: number;
  users: number;
  online: number;
  views: number;
  copies: number;
  downloads: number;
  favorites: number;
  games: number;
};
