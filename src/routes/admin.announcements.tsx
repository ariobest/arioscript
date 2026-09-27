import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { adminLog } from "@/lib/adminLog";
import { timeAgo } from "@/lib/format";
import { DynamicIcon } from "@/components/site/DynamicIcon";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [icon, setIcon] = useState("Megaphone");
  const [link, setLink] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [active, setActive] = useState(true);

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
    if (end && start && new Date(end) < new Date(start)) return toast.error("End date must follow start date");
    if (link && !/^https?:\/\//i.test(link)) return toast.error("Link must start with https://");
    const { error } = await supabase.from("announcements").insert({ title: title.trim().slice(0, 120), content: content.trim().slice(0, 2000), icon: icon.trim().slice(0, 50) || "Megaphone", link_url: link.trim() || null, start_at: start ? new Date(start).toISOString() : null, end_at: end ? new Date(end).toISOString() : null, active });
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "created announcement", targetType: "announcement", details: title });
    setTitle("");
    setContent("");
    setLink(""); setStart(""); setEnd("");
    toast.success("Announcement published");
    refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("announcements").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (user) await adminLog({ adminId: user.id, action: "deleted announcement", targetType: "announcement", targetId: id });
    refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Announcements</h1>

      <div className="glass space-y-3 rounded-2xl p-5">
        <input className="input-base" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input-base" rows={3} placeholder="Message shown on the homepage" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Lucide icon name <span className="inline-block align-middle text-primary"><DynamicIcon name={icon} size={15} /></span><input className="input-base mt-1" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Megaphone" /></label><label className="text-xs text-muted-foreground">Link URL<input type="url" className="input-base mt-1" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" /></label><label className="text-xs text-muted-foreground">Start date<input type="datetime-local" className="input-base mt-1" value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-xs text-muted-foreground">End date<input type="datetime-local" className="input-base mt-1" value={end} onChange={e => setEnd(e.target.value)} /></label></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Enabled</label>
        <button onClick={() => void create()} className="btn btn-primary"><Plus size={15} /> Publish announcement</button>
      </div>

      <div className="space-y-3">
        {(items.data ?? []).map((a) => (
          <div key={a.id} className="glass flex items-start gap-3 rounded-2xl p-4">
            <DynamicIcon name={a.icon} size={17} className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(a.created_at)} · {a.active ? "visible" : "hidden"}</p>
              {a.link_url && <a href={a.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary">{a.link_url}</a>}
              <p className="text-xs text-muted-foreground">{a.start_at && `Starts ${new Date(a.start_at).toLocaleString()}`} {a.end_at && `Ends ${new Date(a.end_at).toLocaleString()}`}</p>
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
