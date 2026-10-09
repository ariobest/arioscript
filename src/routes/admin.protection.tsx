import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";

export const Route = createFileRoute("/admin/protection")({
  head: () => ({ meta: [{ title: "Script Protection — ARIO SCRIPTS" }, { name: "description", content: "Manage protection settings for raw Lua scripts." }] }),
  component: AdminScriptProtection,
});

type ProtectionRow = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  is_protected: boolean;
  protected_message: string;
  updated_at: string;
};
type Draft = { is_protected: boolean; protected_message: string };

const rawUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/raw/${slug}`;

function AdminScriptProtection() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["raw_script_protection"],
    enabled: isStaff,
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_raw_script_protection", { _request: true });
      if (error) throw error;
      return (data ?? []) as ProtectionRow[];
    },
  });

  if (!isStaff) {
    return <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Only administrators can manage script protection.</div>;
  }

  function current(row: ProtectionRow): Draft {
    return drafts[row.slug] ?? { is_protected: row.is_protected, protected_message: row.protected_message || "GO PLAY DUM" };
  }

  async function save(row: ProtectionRow) {
    if (!user || saving) return;
    const draft = current(row);
    setSaving(row.slug);
    try {
      const { data, error } = await supabase.rpc("admin_set_raw_script_protection", {
        _slug: row.slug,
        _is_protected: draft.is_protected,
        _protected_message: draft.protected_message.trim() || "GO PLAY DUM",
      });
      if (error) throw error;
      if (!data) throw new Error("Script was not found");
      await adminLog({ adminId: user.id, action: draft.is_protected ? "enabled raw script protection" : "disabled raw script protection", targetType: "raw_script", details: row.name });
      toast.success("Protection settings saved");
      setDrafts((all) => { const next = { ...all }; delete next[row.slug]; return next; });
      await qc.invalidateQueries({ queryKey: ["raw_script_protection"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save protection settings");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck size={21} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">Script protection</h1>
          <p className="text-sm text-muted-foreground">Protection settings are managed here, separately from Lua uploads.</p>
        </div>
        <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: ["raw_script_protection"] })} className="btn btn-ghost"><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="glass rounded-2xl border border-primary/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={19} className="mt-0.5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">How this protection works</p>
            <p className="mt-1 text-muted-foreground">When enabled, normal browser requests to a raw URL receive your custom message instead of the Lua source. This is only a basic browser deterrent, not strong protection: clients can spoof their user-agent or retrieve code through other means.</p>
          </div>
        </div>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Loading protection settings…</p>}
      {query.error && <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Could not load protection settings: {query.error.message}</div>}
      {(query.data ?? []).map((row) => {
        const draft = current(row);
        return (
          <section key={row.id} className="glass min-w-0 space-y-4 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${draft.is_protected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {draft.is_protected ? <ShieldCheck size={19} /> : <ShieldAlert size={19} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{row.name}</p>
                <p className="break-all font-mono text-xs text-primary">{rawUrl(row.slug)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.enabled ? "Enabled" : "Disabled"} · {draft.is_protected ? "Protection on" : "Protection off"}</p>
              </div>
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm">
                <input type="checkbox" checked={draft.is_protected} onChange={(e) => setDrafts((all) => ({ ...all, [row.slug]: { ...current(row), is_protected: e.target.checked } }))} />
                Protect raw URL
              </label>
            </div>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              Message shown instead of source
              <input className="input-base w-full" value={draft.protected_message} onChange={(e) => setDrafts((all) => ({ ...all, [row.slug]: { ...current(row), protected_message: e.target.value } }))} placeholder="GO PLAY DUM" maxLength={500} />
            </label>
            <div className="flex justify-end">
              <button type="button" disabled={saving !== null} onClick={() => void save(row)} className="btn btn-primary disabled:opacity-50"><Save size={15} /> {saving === row.slug ? "Saving…" : "Save protection"}</button>
            </div>
          </section>
        );
      })}
      {query.data && query.data.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No raw Lua files are available to protect yet. Upload a file in Lua uploads first.</div>}
    </div>
  );
}
