import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Terminal, Search, Menu, X, Heart, LogIn, LogOut, Shield, Trophy, Gamepad2, LayoutGrid, User,
   MessageCircle, Youtube, Send, Github, ExternalLink,
} from "lucide-react";
import { ThemePicker } from "./ThemePicker";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, applyTheme, applyMode } from "@/lib/theme";

const NAV = [
  { to: "/scripts", label: "Scripts", icon: Terminal },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/leaderboards", label: "Leaderboards", icon: Trophy },
] as const;

export function useSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user, profile, isStaff, signOut } = useAuth();
  const { data: settings } = useSettings();

  useEffect(() => {
    if (!settings) return;
    if (!localStorage.getItem("ario-theme") && THEMES.some(t => t === settings.theme)) applyTheme(settings.theme as typeof THEMES[number]);
    if (!localStorage.getItem("ario-mode")) applyMode(settings.color_mode === "light" ? "light" : "dark");
  }, [settings?.theme, settings?.color_mode]);

  useEffect(() => {
    if (!settings?.background_color || !/^#[0-9a-f]{6}$/i.test(settings.background_color)) return;
    document.documentElement.style.setProperty("--background", settings.background_color);
    return () => { document.documentElement.style.removeProperty("--background"); };
  }, [settings?.background_color]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/scripts", search: { q: q || undefined, sort: undefined, category: undefined, game: undefined } as never });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_oklab,var(--background)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
             <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-primary/15 text-primary glow-ring">
               {settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-full w-full object-contain" /> : <Terminal size={18} />}
            </span>
            <span className="font-display text-sm font-bold tracking-tight sm:text-base">
              {settings?.site_name ?? "ARIO SCRIPTS"}
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm text-foreground bg-secondary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submit} className="relative ml-auto hidden max-w-xs flex-1 md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search scripts, games, tags..."
              className="input-base !pl-9"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemePicker />
            {user ? (
              <>
                <Link to="/favorites" className="btn btn-ghost h-9 w-9 !p-0" aria-label="Favorites">
                  <Heart size={16} />
                </Link>
                {isStaff && (
                  <Link to="/admin" className="btn btn-ghost h-9 w-9 !p-0" aria-label="Admin">
                    <Shield size={16} />
                  </Link>
                )}
                <Link
                  to="/u/$username"
                  params={{ username: profile?.username ?? "" }}
                  className="btn btn-ghost hidden h-9 sm:inline-flex"
                >
                  <User size={15} />
                  <span className="max-w-24 truncate">{profile?.username ?? "Profile"}</span>
                </Link>
                <button onClick={() => void signOut()} className="btn btn-ghost h-9 w-9 !p-0" aria-label="Sign out">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary h-9">
                <LogIn size={15} /> Sign in
              </Link>
            )}
            <button className="btn btn-ghost h-9 w-9 !p-0 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border p-4 lg:hidden">
            <form onSubmit={submit} className="relative mb-3 md:hidden">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="input-base !pl-9" />
            </form>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">
                  <n.icon size={15} /> {n.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Terminal size={16} />
            </span>
            <span className="font-display font-bold">{settings?.site_name ?? "ARIO SCRIPTS"}</span>
          </Link>
          <p className="max-w-md text-sm text-muted-foreground">
            {settings?.description ?? "A curated, admin-managed script database."}
          </p>
          <div className="flex gap-2">
            {settings?.discord_url && (
              <a href={settings.discord_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-9 !p-0"><MessageCircle size={16} /></a>
            )}
            {settings?.youtube_url && (
              <a href={settings.youtube_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-9 !p-0"><Youtube size={16} /></a>
            )}
            {settings?.telegram_url && (
              <a href={settings.telegram_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-9 !p-0"><Send size={16} /></a>
            )}
            {settings?.support_url && (
              <a href={settings.support_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-9 !p-0"><Github size={16} /></a>
            )}
            {settings?.other_social_url && <a href={settings.other_social_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-9 !p-0" aria-label="Other social link"><ExternalLink size={16} /></a>}
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {settings?.site_name ?? "ARIO SCRIPTS"}. Scripts are curated by our team.
          </p>
        </div>
      </footer>
    </div>
  );
}
