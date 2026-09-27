import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Check, Circle, ShieldCheck, X, UserCog, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { formatDate, isOnline, timeAgo } from "@/lib/format";
import { DynamicIcon } from "@/components/site/DynamicIcon";
import { SCRIPT_SELECT } from "@/lib/queries";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string; username: string; email: string | null; avatar_url: string | null;
  is_banned: boolean; is_disabled: boolean; last_seen: string; created_at: string;
};

function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const users = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const roles = useQuery({
    queryKey: ["all_roles"],
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

  const badges = useQuery({ queryKey: ["badges"], queryFn: async () => (await supabase.from("badges").select("*").order("name")).data ?? [] });

  const userBadges = useQuery({
    queryKey: ["all_user_badges"],
    queryFn: async () => (await supabase.from("user_badges").select("user_id, badge_id, badges(*)")).data ?? [],
  });

  const detail = useQuery({
    queryKey: ["user_detail", open?.id],
    enabled: !!open,
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

  async function setBan(row: Row, banned: boolean) {
    const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", row.id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: banned ? "banned user" : "unbanned user", targetType: "user", targetId: row.id, details: row.username });
    toast.success(banned ? "User banned" : "User unbanned");
    refresh();
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

  const rows = (users.data ?? []).filter((u) =>
    !search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input-base ml-auto max-w-56" />
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
                    {u.is_banned && <span className="chip ml-1 text-destructive">Banned</span>}
                    {u.is_disabled && <span className="chip ml-1 text-muted-foreground">Disabled</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button title="View" onClick={() => setOpen(u)} className="btn btn-ghost !p-1.5"><UserCog size={14} /></button>
                      <button title={u.is_banned ? "Unban" : "Ban"} onClick={() => void setBan(u, !u.is_banned)} className="btn btn-ghost !p-1.5 text-destructive"><Ban size={14} /></button>
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
              <button onClick={() => void setBan(open, !open.is_banned)} className="btn btn-ghost text-destructive"><Ban size={14} /> {open.is_banned ? "Unban" : "Ban"} user</button>
              <button onClick={() => void changeRole(open, "moderator")} className="btn btn-ghost"><ShieldCheck size={14} /> Make moderator</button>
              <button onClick={() => void changeRole(open, "admin")} className="btn btn-ghost"><ShieldCheck size={14} /> Make admin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
