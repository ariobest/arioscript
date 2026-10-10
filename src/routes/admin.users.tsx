import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Check, Circle, ShieldCheck, X, UserCog, Award, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { formatDate, isOnline, timeAgo } from "@/lib/format";
import { DynamicIcon } from "@/components/site/DynamicIcon";
import { SCRIPT_SELECT } from "@/lib/queries";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: 'Manage Users — ARIO SCRIPTS' }, { name: "description", content: 'Manage ARIO SCRIPTS members, roles and badges.' }, { property: "og:title", content: 'Manage Users — ARIO SCRIPTS' }, { property: "og:description", content: 'Manage ARIO SCRIPTS members, roles and badges.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminUsers,
});

type Row = {
  id: string; username: string; email: string | null; avatar_url: string | null;
  is_banned: boolean; is_soft_banned: boolean; ban_expires_at: string | null; ban_reason: string | null; is_disabled: boolean; last_seen: string; created_at: string;
};

function AdminUsers() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [banTarget, setBanTarget] = useState<Row | null>(null);
  const [banMode, setBanMode] = useState<"hard" | "soft">("hard");
  const [banDuration, setBanDuration] = useState("permanent");
  const [banReason, setBanReason] = useState("");

  const users = useQuery({
    queryKey: ["admin_users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const roles = useQuery({
    queryKey: ["all_roles"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const favCounts = useQuery({
    queryKey: ["fav_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("user_id");
      const m = new Map<string, number>();
      for (const f of data ?? []) m.set(f.user_id, (m.get(f.user_id) ?? 0) + 1);
      return m;
    },
  });

  const badges = useQuery({ queryKey: ["badges"], enabled: isAdmin, queryFn: async () => (await supabase.from("badges").select("*").order("name")).data ?? [] });

  const userBadges = useQuery({
    queryKey: ["all_user_badges"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("user_badges").select("user_id, badge_id, badges(*)")).data ?? [],
  });

  const detail = useQuery({
    queryKey: ["user_detail", open?.id],
    enabled: !!open && isAdmin,
    queryFn: async () => {
      const [favs, reports] = await Promise.all([
        supabase.from("favorites").select(`created_at, scripts(${SCRIPT_SELECT})`).eq("user_id", open!.id),
        supabase.from("reports").select("*, scripts(name)").eq("user_id", open!.id).order("created_at", { ascending: false }),
      ]);
      return { favorites: favs.data ?? [], reports: reports.data ?? [] };
    },
  });

  function roleOf(id: string) {
    const list = (roles.data ?? []).filter((r) => r.user_id === id).map((r) => r.role as string);
    return list.includes("admin") ? "admin" : list.includes("moderator") ? "moderator" : "user";
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin_users"] });
    void qc.invalidateQueries({ queryKey: ["all_roles"] });
    void qc.invalidateQueries({ queryKey: ["all_user_badges"] });
  }

  function activeBan(row: Row) {
    return (row.is_banned || row.is_soft_banned) && (!row.ban_expires_at || new Date(row.ban_expires_at).getTime() > Date.now());
  }

  async function setBan(row: Row, banned: boolean) {
    if (!isAdmin) return toast.error("Administrator access required");
    if (user?.id === row.id) return toast.error("You cannot ban your own administrator account");
    const { error } = await supabase.from("profiles").update({
      is_banned: banned, is_soft_banned: false, ban_expires_at: null, ban_reason: null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: banned ? "banned user" : "unbanned user", targetType: "user", targetId: row.id, details: row.username });
    toast.success(banned ? "User banned permanently" : "User unbanned");
    refresh();
  }

  async function applyBan() {
    const row = banTarget;
    if (!row || !isAdmin || !user) return;
    if (user.id === row.id) return toast.error("You cannot ban your own administrator account");
    const expiresAt = banDuration === "permanent" ? null : new Date(Date.now() + Number(banDuration) * 60_000).toISOString();
    const isSoft = banMode === "soft";
    const { error } = await supabase.from("profiles").update({
      is_banned: !isSoft, is_soft_banned: isSoft, ban_expires_at: expiresAt, ban_reason: banReason.trim() || null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await adminLog({ adminId: user.id, action: isSoft ? "soft banned user" : "banned user", targetType: "user", targetId: row.id,
      details: `${row.username} · ${banDuration === "permanent" ? "permanent" : `${banDuration} minutes`}${banReason.trim() ? ` · ${banReason.trim()}` : ""}` });
    toast.success(isSoft ? "Soft ban applied" : "Ban applied");
    setBanTarget(null); setBanReason(""); refresh();
  }

  async function setDisabled(row: Row, disabled: boolean) {
    const { error } = await supabase.from("profiles").update({ is_disabled: disabled }).eq("id", row.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: disabled ? "disabled account" : "enabled account", targetType: "user", targetId: row.id, details: row.username });
    toast.success("Account status updated");
    refresh();
  }

  async function changeRole(row: Row, role: string) {
    await supabase.from("user_roles").delete().eq("user_id", row.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: role as "user" | "moderator" | "admin" });
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "changed role", targetType: "user", targetId: row.id, details: `${row.username} → ${role}` });
    toast.success(`${row.username} is now ${role}`);
    refresh();
  }

  async function toggleBadge(row: Row, badgeId: string, has: boolean) {
    if (has) {
      await supabase.from("user_badges").delete().eq("user_id", row.id).eq("badge_id", badgeId);
    } else {
      const { error } = await supabase.from("user_badges").insert({ user_id: row.id, badge_id: badgeId, assigned_by: user?.id ?? null });
      if (error) return toast.error(error.message);
    }
    if (user) await adminLog({ adminId: user.id, action: has ? "removed badge" : "gave badge", targetType: "user", targetId: row.id, details: row.username });
    refresh();
  }

  if (!isAdmin) {
    return <div className="glass mx-auto mt-8 max-w-lg rounded-2xl p-8 text-center"><ShieldAlert size={28} className="mx-auto text-destructive"/><h1 className="mt-3 font-display text-xl font-bold">Administrator only</h1><p className="mt-2 text-sm text-muted-foreground">User moderation tools are restricted to administrators.</p></div>;
  }

  const rows = (users.data ?? []).filter((u) =>
    !search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input-base w-full sm:ml-auto sm:w-auto sm:max-w-56" />
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Favs</th>
              <th className="px-4 py-3">Badges</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const ub = (userBadges.data ?? []).filter((b) => b.user_id === u.id);
              return (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-primary/15 text-xs font-bold text-primary">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : u.username.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(u.last_seen)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{favCounts.data?.get(u.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ub.map((b) => (
                        <span key={b.badge_id} className="chip" style={{ color: b.badges?.color, borderColor: (b.badges?.color ?? "") + "55" }}>
                          <DynamicIcon name={b.badges?.icon} size={10} /> {b.badges?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={roleOf(u.id)} onChange={(e) => void changeRole(u, e.target.value)} className="input-base !py-1 !text-xs">
                      {["user", "moderator", "admin"].map((r) => <option key={r} value={r} className="bg-background">{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${isOnline(u.last_seen) ? "text-[var(--success)]" : "text-muted-foreground"}`}>
                      <Circle size={7} fill="currentColor" /> {isOnline(u.last_seen) ? "Online" : "Offline"}
                    </span>
                    {activeBan(u) && <span className="chip ml-1 text-destructive">{u.is_soft_banned ? "Soft banned" : "Banned"}{u.ban_expires_at ? ` · until ${formatDate(u.ban_expires_at)}` : ""}</span>}
                    {u.is_disabled && <span className="chip ml-1 text-muted-foreground">Disabled</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button title="View" onClick={() => setOpen(u)} className="btn btn-ghost !p-1.5"><UserCog size={14} /></button>
                      <button title={activeBan(u) ? "Unban" : "Ban options"} onClick={() => activeBan(u) ? void setBan(u, false) : (setBanTarget(u), setBanMode("hard"), setBanDuration("permanent"), setBanReason(""))} className="btn btn-ghost !p-1.5 text-destructive"><Ban size={14} /></button>
                      <button title={u.is_disabled ? "Enable" : "Disable"} onClick={() => void setDisabled(u, !u.is_disabled)} className="btn btn-ghost !p-1.5">{u.is_disabled ? <Check size={14} /> : <X size={14} />}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={() => setOpen(null)}>
          <div className="glass mx-auto my-6 w-full max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-primary/15 font-bold text-primary">
                {open.avatar_url ? <img src={open.avatar_url} alt="" className="h-full w-full object-cover" /> : open.username.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">{open.username}</h2>
                <p className="text-xs text-muted-foreground">{open.email} · joined {formatDate(open.created_at)}</p>
              </div>
              <button onClick={() => setOpen(null)} className="btn btn-ghost ml-auto !p-1.5"><X size={15} /></button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl border border-border p-3"><p className="font-display text-lg font-bold">{detail.data?.favorites.length ?? 0}</p><p className="text-[11px] text-muted-foreground">Favorites</p></div>
              <div className="rounded-xl border border-border p-3"><p className="font-display text-lg font-bold">{detail.data?.reports.length ?? 0}</p><p className="text-[11px] text-muted-foreground">Reports filed</p></div>
              <div className="rounded-xl border border-border p-3"><p className="font-display text-lg font-bold capitalize">{roleOf(open.id)}</p><p className="text-[11px] text-muted-foreground">Role</p></div>
              <div className="rounded-xl border border-border p-3"><p className="font-display text-lg font-bold">{isOnline(open.last_seen) ? "Online" : "Offline"}</p><p className="text-[11px] text-muted-foreground">Last seen {timeAgo(open.last_seen)}</p></div>
            </div>

            <h3 className="mt-6 flex items-center gap-2 font-display font-semibold"><Award size={15} className="text-primary" /> Badges</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(badges.data ?? []).map((b) => {
                const has = (userBadges.data ?? []).some((x) => x.user_id === open.id && x.badge_id === b.id);
                return (
                  <button key={b.id} onClick={() => void toggleBadge(open, b.id, has)} className={`chip ${has ? "!border-primary" : "text-muted-foreground"}`} style={has ? { color: b.color } : undefined}>
                    <DynamicIcon name={b.icon} size={11} /> {b.name} {has ? "✓" : "+"}
                  </button>
                );
              })}
            </div>

            <h3 className="mt-6 font-display font-semibold">Recent reports</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(detail.data?.reports ?? []).map((r) => (
                <li key={r.id}>{(r as { scripts?: { name?: string } }).scripts?.name} — {r.reason} ({r.status})</li>
              ))}
              {!(detail.data?.reports ?? []).length && <li>No reports.</li>}
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => activeBan(open) ? void setBan(open, false) : (setBanTarget(open), setBanMode("hard"), setBanDuration("permanent"), setBanReason(""))} className="btn btn-ghost text-destructive"><Ban size={14} /> {activeBan(open) ? "Unban user" : "Ban options"}</button>
              <button onClick={() => void changeRole(open, "moderator")} className="btn btn-ghost"><ShieldCheck size={14} /> Make moderator</button>
              <button onClick={() => void changeRole(open, "admin")} className="btn btn-ghost"><ShieldCheck size={14} /> Make admin</button>
            </div>
          </div>
        </div>
      )}
      {banTarget && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4" onClick={() => setBanTarget(null)}>
          <section className="glass my-auto w-full max-w-lg rounded-2xl border border-primary/20 p-5 shadow-[0_24px_90px_-30px_hsl(var(--primary)/.65)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"><ShieldAlert size={19}/></span>
              <div className="min-w-0 flex-1"><h2 className="font-display text-lg font-bold">Moderate {banTarget.username}</h2><p className="mt-1 text-sm text-muted-foreground">Choose a full ban or a soft ban and when it should expire.</p></div>
              <button aria-label="Close moderation dialog" onClick={() => setBanTarget(null)} className="btn btn-ghost !p-1.5"><X size={15}/></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setBanMode("hard")} className={`rounded-xl border p-3 text-left transition ${banMode === "hard" ? "border-destructive/60 bg-destructive/10" : "border-border bg-background/20"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold"><Ban size={15}/> Full ban</span><span className="mt-1 block text-xs text-muted-foreground">Block account access</span>
              </button>
              <button onClick={() => setBanMode("soft")} className={`rounded-xl border p-3 text-left transition ${banMode === "soft" ? "border-primary/60 bg-primary/10" : "border-border bg-background/20"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15}/> Soft ban</span><span className="mt-1 block text-xs text-muted-foreground">Keep browsing, block interactions</span>
              </button>
            </div>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">Duration</label>
            <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)} className="input-base mt-1 w-full">
              <option value="permanent" className="bg-background">Permanent — until manually unbanned</option>
              <option value="1" className="bg-background">1 minute (test)</option>
              <option value="60" className="bg-background">1 hour</option>
              <option value="1440" className="bg-background">24 hours</option>
              <option value="10080" className="bg-background">7 days</option>
              <option value="43200" className="bg-background">30 days</option>
            </select>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">Reason (optional)</label>
            <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={300} rows={3} placeholder="Add a moderation note…" className="input-base mt-1 w-full resize-y"/>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => setBanTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => void applyBan()} className="btn btn-primary"><Clock size={14}/> Apply {banMode === "soft" ? "soft ban" : "ban"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
