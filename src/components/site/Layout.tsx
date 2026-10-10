import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Terminal, Search, Menu, X, Heart, LogIn, LogOut, Shield, Trophy, Gamepad2, LayoutGrid, User,
   MessageCircle, Youtube, Send, Github, ExternalLink,
  KeyRound, Bell, Code2, LayoutDashboard, Settings,
} from "lucide-react";
import { ThemePicker } from "./ThemePicker";
import { FirstVisitTerminal } from "./FirstVisitTerminal";
import catLogo from "@/assets/ario-logo.png.asset.json";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, applyTheme, applyMode } from "@/lib/theme";
import { SITE_BRAND } from "@/lib/brand";

const NAV = [
  { to: "/scripts", label: "Scripts", icon: Terminal },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { to: "/keys", label: "Get Key", icon: KeyRound },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  const pathname = useRouterState({ select: state => state.location.pathname });
  const { user, profile, isStaff, signOut } = useAuth();
  const { data: settings } = useSettings();

  useEffect(() => {
    if (!settings) return;
    if (!localStorage.getItem("ario-theme") && THEMES.some(t => t === settings.theme)) applyTheme(settings.theme as typeof THEMES[number], false);
    if (!localStorage.getItem("ario-mode")) applyMode(settings.color_mode === "light" ? "light" : "dark", false);
  }, [settings?.theme, settings?.color_mode]);

  useEffect(() => {
    if (!settings?.background_color || !/^#[0-9a-f]{6}$/i.test(settings.background_color)) return;
    document.documentElement.style.setProperty("--background", settings.background_color);
    return () => { document.documentElement.style.removeProperty("--background"); };
  }, [settings?.background_color]);

  useEffect(() => {
    if (!settings?.custom_css) return;
    const stylesheet = document.createElement("style");
    stylesheet.dataset['arioCustom'] = "true";
    stylesheet.textContent = settings.custom_css;
    document.head.appendChild(stylesheet);
    return () => { stylesheet.remove(); };
  }, [settings?.custom_css]);

  useEffect(() => {
    if (!settings?.favicon_url) return;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    const original = icon.href;
    icon.href = settings.favicon_url;
    return () => { icon.href = original; };
  }, [settings?.favicon_url]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/scripts", search: { q: q || undefined, sort: undefined, category: undefined, game: undefined } as never });
  }

  const hardBanned = !!profile?.is_banned && (!profile.ban_expires_at || new Date(profile.ban_expires_at).getTime() > Date.now());
  const softBanned = !!profile?.is_soft_banned && (!profile.ban_expires_at || new Date(profile.ban_expires_at).getTime() > Date.now());

  if (user && hardBanned) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
        <section className="glass w-full max-w-md rounded-3xl border border-destructive/30 p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><Shield size={25}/></span>
          <h1 className="mt-5 font-display text-2xl font-bold">Account suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">This account is currently banned from ARIO SCRIPTS.</p>
          {profile?.ban_reason && <p className="mt-4 rounded-xl border border-border bg-background/40 p-3 text-sm">Reason: {profile.ban_reason}</p>}
          {profile?.ban_expires_at && <p className="mt-3 text-xs text-muted-foreground">Ban expires: {new Date(profile.ban_expires_at).toLocaleString()}</p>}
          <button onClick={() => void signOut()} className="btn btn-primary mt-6 w-full">Sign out</button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <FirstVisitTerminal />
      {user && softBanned && <div className="border-b border-primary/25 bg-primary/10 px-4 py-2 text-center text-xs text-foreground"><strong>Soft ban active.</strong> Browsing remains available, but account interactions are restricted.{profile?.ban_reason ? ` Reason: ${profile.ban_reason}` : ""}{profile?.ban_expires_at ? ` Expires ${new Date(profile.ban_expires_at).toLocaleString()}.` : ""}</div>}
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_oklab,var(--background)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 md:flex md:gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
             <span aria-hidden="true" className="ario-theme-logo ario-logo-glow h-9 w-9 shrink-0 bg-[var(--primary)] drop-shadow-[0_0_12px_var(--primary)]" style={{ WebkitMaskImage: `url(${catLogo.url})`, maskImage: `url(${catLogo.url})`, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }} />
             <span className="min-w-0 truncate font-display text-sm font-bold tracking-tight sm:text-base">
              {settings?.site_name ?? SITE_BRAND.name}
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

           <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
            <ThemePicker />
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-ghost h-9 w-9 !p-0" aria-label="Dashboard"><LayoutDashboard size={16} /></Link>
                <Link to="/notifications" className="btn btn-ghost h-9 w-9 !p-0" aria-label="Notifications"><Bell size={16} /></Link>
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

      <main className="flex-1">{settings?.maintenance_mode && !isStaff && !pathname.startsWith("/auth") && !pathname.startsWith("/admin") ? <div className="mx-auto max-w-xl px-4 py-28 text-center"><h1 className="text-2xl font-bold">{settings.site_name} is under maintenance</h1><p className="mt-3 text-muted-foreground">Please check back soon.</p></div> : children}</main>

      <footer className="mt-16 border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Terminal size={16} />
            </span>
            <span className="font-display font-bold">{settings?.site_name ?? SITE_BRAND.name}</span>
          </Link>
          <p className="max-w-md text-sm text-muted-foreground">
            {settings?.description ?? SITE_BRAND.description}
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
            © {new Date().getFullYear()} {settings?.site_name ?? SITE_BRAND.name}. Scripts are curated by our team.
          </p>
        </div>
      </footer>
      <div className="h-20" aria-hidden />
      <nav className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3" aria-label="Quick navigation">
        <div className="glass flex w-full max-w-md items-center justify-between gap-1 rounded-2xl border border-border p-1.5 shadow-lg">
          {[{ to: "/", label: "Home", icon: Terminal }, ...NAV.filter(n => n.to !== "/categories")].map(n => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <n.icon size={18} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
