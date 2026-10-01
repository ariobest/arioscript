import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Shield, LayoutDashboard, Terminal, Users, Award, Flag, Megaphone, Settings, ScrollText, BarChart3, Lock, Mail, KeyRound, Images, Bot, Palette,
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
  { to: "/admin/assistant", label: "Script assistant", icon: Bot },
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

  if (loading) return <div className="py-24 text-center text-sm text-muted-foreground">Checking permissions…</div>;
  if (!user) return <AdminLogin />;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield size={26} className="mx-auto text-destructive" />
        <h1 className="mt-3 font-display text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account ({profile?.username}) is not an administrator.
        </p>
        <Link to="/" className="btn btn-ghost mt-6">Back to site</Link>
      </div>
    );
  }

  return (
    <div className="admin-shell mx-auto flex max-w-7xl gap-6 px-3 py-4 sm:px-4 sm:py-8">
      <aside className="glass hidden h-fit w-56 shrink-0 rounded-2xl p-3 lg:block lg:sticky lg:top-24">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
        <nav className="space-y-0.5">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: "exact" in l ? l.exact : false }}
              activeProps={{ className: "flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-primary/15 text-primary" }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <l.icon size={15} /> {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="admin-mobile-nav glass sticky top-[4.5rem] z-30 -mx-1 mb-4 flex gap-1.5 overflow-x-auto rounded-2xl p-2 lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-3 text-xs font-semibold text-muted-foreground" activeProps={{ className: "flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary" }}>
              <l.icon size={14} className="shrink-0" /> {l.label}
            </Link>
          ))}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
