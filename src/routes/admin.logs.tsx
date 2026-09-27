import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({ meta: [{ title: 'Admin Logs — ARIO SCRIPTS' }, { name: "description", content: 'Review staff activity on ARIO SCRIPTS.' }, { property: "og:title", content: 'Admin Logs — ARIO SCRIPTS' }, { property: "og:description", content: 'Review staff activity on ARIO SCRIPTS.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminLogs,
});

function AdminLogs() {
  const logs = useQuery({
    queryKey: ["admin_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*, profiles:admin_id(username)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ScrollText size={19} className="text-primary" />
        <h1 className="font-display text-2xl font-bold">Admin logs</h1>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {(logs.data ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-primary">{(l as { profiles?: { username?: string } }).profiles?.username ?? "—"}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.target_type ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.details ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(l.created_at)}</td>
              </tr>
            ))}
            {!(logs.data ?? []).length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No admin actions logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
