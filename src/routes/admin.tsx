import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Shield, LayoutDashboard, Terminal, Users, Award, Flag, Megaphone, Settings, ScrollText, BarChart3, Lock, Mail, KeyRound, Images, Bot, Palette, Code2, MessageSquare, ChevronRight, Activity, Zap, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: 'Admin Login — ARIO SCRIPTS' }, { name: "description", content: 'Sign in to manage ARIO SCRIPTS.' }, { property: "og:title", content: 'Admin Login — ARIO SCRIPTS' }, { property: "og:description", content: 'Sign in to manage ARIO SCRIPTS.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/scripts", label: "Scripts", icon: Terminal },
  { to: "/admin/raw", label: "Raw loader", icon: Terminal },
  { to: "/admin/keys", label: "Keys", icon: KeyRound },
  { to: "/admin/assistant", label: "Script assistant", icon: Bot },
  { to: "/admin/studio", label: "Studio", icon: Code2 },
  { to: "/admin/discord", label: "Discord control", icon: MessageSquare },
  { to: "/admin/themes", label: "Themes", icon: Palette },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/badges", label: "Badges", icon: Award },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/media", label: "Media manager", icon: Images },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/logs", label: "Admin logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Invalid administrator credentials");
    else {
      toast.success("Signed in");
      navigate({ to: "/admin" });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="glass fade-up rounded-2xl p-7">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring">
          <Lock size={19} />
        </span>
        <h1 className="mt-4 text-center font-display text-xl font-bold">Administrator login</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">This area is restricted to ARIO staff.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="input-base !pl-9" />
          </div>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-base !pl-9" />
          </div>
          <button disabled={busy} className="btn btn-primary w-full">{busy ? "Verifying…" : "Enter admin panel"}</button>
        </form>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { user, isStaff, loading, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">Checking permissions…</div>;
  if (!user) return <AdminLogin />;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield size={30} className="mx-auto text-destructive" />
        <h1 className="mt-3 font-display text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account ({profile?.username}) is not an administrator.</p>
        <Link to="/" className="btn btn-ghost mt-6">Back to site</Link>
      </div>
    );
  }

  const groups = [
    { label: "Overview", links: LINKS.filter(x => ["/admin","/admin/analytics","/admin/logs"].includes(x.to)) },
    { label: "Content", links: LINKS.filter(x => ["/admin/scripts","/admin/raw","/admin/keys","/admin/media","/admin/themes"].includes(x.to)) },
    { label: "Tools", links: LINKS.filter(x => ["/admin/assistant","/admin/studio","/admin/discord"].includes(x.to)) },
    { label: "Community", links: LINKS.filter(x => ["/admin/users","/admin/badges","/admin/reports","/admin/announcements"].includes(x.to)) },
    { label: "System", links: LINKS.filter(x => x.to === "/admin/settings") },
  ];

  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="space-y-4">
      {groups.map(group => (
        <div key={group.label}>
          {(!collapsed || mobile) && <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[.2em] text-muted-foreground/60">{group.label}</p>}
          <div className="space-y-1">
            {group.links.map(l => {
              const Icon = l.icon;
              return (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: "exact" in l ? l.exact : false }}
                onClick={() => setMobileOpen(false)}
                activeProps={{ className: "group relative flex items-center gap-3 rounded-xl bg-primary/12 px-3 py-2.5 text-sm font-medium text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/.16)]" }}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-secondary/70 hover:text-foreground"
                title={collapsed && !mobile ? l.label : undefined}
              >
                <Icon size={17} strokeWidth={1.9} className="shrink-0 transition-transform duration-200 group-hover:scale-[1.06]" aria-hidden="true" />
                {(!collapsed || mobile) && <span className="truncate">{l.label}</span>}
                {(!collapsed || mobile) && <ChevronRight size={13} className="ml-auto opacity-0 transition-opacity group-hover:opacity-60" />}
              </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="ario-admin-shell min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/.10),transparent_30%),radial-gradient(circle_at_90%_20%,hsl(220_80%_60%/.06),transparent_25%)]">
      <div className="mx-auto flex max-w-[1500px] gap-4 px-3 py-4 sm:px-5 lg:gap-5 lg:py-6">
        <aside className={"glass sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 flex-col rounded-3xl p-3 lg:flex " + (collapsed ? "w-[72px]" : "w-64")}>
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring"><Shield size={19}/></div>
            {!collapsed && <div className="min-w-0"><p className="font-display text-sm font-bold">ARIO ADMIN</p><p className="text-[9px] uppercase tracking-widest text-primary">Control Center</p></div>}
          </div>
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border/50 bg-background/25 p-2">
            <Activity size={14} className="text-emerald-400"/>
            {!collapsed && <span className="text-[10px] font-semibold text-muted-foreground">Systems operational</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1"><Nav /></div>
          <button onClick={() => setCollapsed(v => !v)} className="mt-3 hidden items-center justify-center rounded-xl border border-border/50 bg-background/25 p-2 text-muted-foreground transition hover:text-foreground xl:flex">
            {collapsed ? <ChevronRight size={15}/> : <ChevronRight size={15} className="rotate-180"/>}
          </button>
        </aside>

        {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />}
        <aside className={"glass fixed inset-y-3 left-3 z-50 w-[280px] rounded-3xl p-4 shadow-2xl transition-transform lg:hidden " + (mobileOpen ? "translate-x-0" : "-translate-x-[120%]")}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary"><Shield size={18}/></div><div><p className="font-bold">ARIO ADMIN</p><p className="text-[9px] uppercase tracking-widest text-primary">Control Center</p></div></div>
            <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><X size={18}/></button>
          </div>
          <div className="overflow-y-auto"><Nav mobile /></div>
        </aside>

        <main className="ario-admin-main min-w-0 flex-1">
          <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-4 py-3 sm:px-5">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-border/50 bg-background/30 p-2 lg:hidden"><Menu size={18}/></button>
            <div className="hidden h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><Zap size={17}/></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-muted-foreground">Welcome back, <span className="text-foreground">{profile?.username || user.email?.split("@")[0] || "Admin"}</span></p>
              <p className="text-[10px] uppercase tracking-[.18em] text-primary">Private administration environment</p>
            </div>
            <Link to="/" className="hidden rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:block">View site</Link>
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
