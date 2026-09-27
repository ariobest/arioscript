import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const items = useQuery({
    queryKey: ["admin_announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin_announcements"] });
    void qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  async function create() {
    if (!title.trim() || !content.trim()) return toast.error("Title and content required");
    const { error } = await supabase.from("announcements").insert({ title, content });
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "created announcement", targetType: "announcement", details: title });
    setTitle("");
    setContent("");
    toast.success("Announcement published");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("announcements").update({ active }).eq("id", id);
    refresh();
  }

  async function remove(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    if (user) await adminLog({ adminId: user.id, action: "deleted announcement", targetType: "announcement", targetId: id });
    refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Announcements</h1>

      <div className="glass space-y-3 rounded-2xl p-5">
        <input className="input-base" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input-base" rows={3} placeholder="Message shown on the homepage" value={content} onChange={(e) => setContent(e.target.value)} />
        <button onClick={() => void create()} className="btn btn-primary"><Plus size={15} /> Publish announcement</button>
      </div>

      <div className="space-y-3">
        {(items.data ?? []).map((a) => (
          <div key={a.id} className="glass flex items-start gap-3 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(a.created_at)} · {a.active ? "visible" : "hidden"}</p>
            </div>
            <button onClick={() => void toggle(a.id, !a.active)} className="btn btn-ghost !p-1.5">{a.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
            <button onClick={() => void remove(a.id)} className="btn btn-ghost !p-1.5 text-destructive"><Trash2 size={14} /></button>
          </div>
        ))}
        {!(items.data ?? []).length && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No announcements yet.</div>}
      </div>
    </div>
  );
}
