import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Archive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: 'Reports — ARIO SCRIPTS' }, { name: "description", content: 'Review and resolve reported scripts.' }, { property: "og:title", content: 'Reports — ARIO SCRIPTS' }, { property: "og:description", content: 'Review and resolve reported scripts.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminReports,
});

function AdminReports() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const reports = useQuery({
    queryKey: ["admin_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, scripts(id, name, slug), profiles:user_id(username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: `report ${status}`, targetType: "report", targetId: id });
    toast.success(`Report ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin_reports"] });
  }

  async function archiveScript(scriptId: string) {
    const { error } = await supabase.from("scripts").update({ archived: true, published: false }).eq("id", scriptId);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "archived reported script", targetType: "script", targetId: scriptId });
    toast.success("Script archived");
    void qc.invalidateQueries({ queryKey: ["admin_scripts"] });
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Reports</h1>

      <div className="space-y-3">
        {(reports.data ?? []).map((r) => {
          const script = (r as { scripts?: { id: string; name: string; slug: string } }).scripts;
          const reporter = (r as { profiles?: { username?: string } }).profiles;
          return (
            <div key={r.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${r.status === "open" ? "text-[var(--warning)]" : r.status === "resolved" ? "text-[var(--success)]" : "text-muted-foreground"}`}>
                  {r.status}
                </span>
                <p className="font-semibold">{r.reason}</p>
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {script ? (
                  <Link to="/scripts/$slug" params={{ slug: script.slug }} className="text-primary hover:underline">{script.name}</Link>
                ) : "Deleted script"}
                {" · reported by "}{reporter?.username ?? "unknown"}
              </p>
              {r.description && <p className="mt-2 text-sm text-foreground/80">{r.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void setStatus(r.id, "resolved")} className="btn btn-primary !py-1 text-xs"><Check size={13} /> Resolve</button>
                <button onClick={() => void setStatus(r.id, "dismissed")} className="btn btn-ghost !py-1 text-xs"><X size={13} /> Dismiss</button>
                {script && <button onClick={() => void archiveScript(script.id)} className="btn btn-ghost !py-1 text-xs text-destructive"><Archive size={13} /> Archive script</button>}
              </div>
            </div>
          );
        })}
        {!(reports.data ?? []).length && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No reports.</div>}
      </div>
    </div>
  );
}
