import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Activity, Bot, Check, Hash, MessageSquare, RefreshCw, Send, Server, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { getDiscordStatus, sendDiscordEmbed, editDiscordEmbed, deleteDiscordMessage } from "@/lib/discord.functions";

export const Route = createFileRoute("/admin/discord")({
  head: () => ({ meta: [{ title: "Discord Control — ARIO SCRIPTS" }, { name: "description", content: "Private ARIO Discord server control center." }] }),
  component: DiscordControl,
});

function DiscordControl() {
  const [guildId, setGuildId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [status, setStatus] = useState<{ guild: { name: string; approximate_member_count?: number; approximate_presence_count?: number }; channels: { id: string; name: string }[] } | null>(null);
  const [title, setTitle] = useState("ARIO Announcement");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#5865f2");
  const [busy, setBusy] = useState(false);
  const load = useServerFn(getDiscordStatus);
  const send = useServerFn(sendDiscordEmbed);
  const edit = useServerFn(editDiscordEmbed);
  const remove = useServerFn(deleteDiscordMessage);

  async function refresh() {
    if (!/^\\d{17,20}$/.test(guildId)) return toast.error("Enter a valid Discord server ID.");
    setBusy(true);
    try {
      const result = await load({ data: { guildId } });
      setStatus(result);
      if (!channelId && result.channels[0]) setChannelId(result.channels[0].id);
      toast.success("Discord connected");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load Discord."); }
    finally { setBusy(false); }
  }

  async function action(kind: "send" | "edit" | "delete") {
    if (!channelId) return toast.error("Choose a text channel.");
    setBusy(true);
    try {
      const base = { guildId, channelId, title, description, content, color: parseInt(color.replace("#", ""), 16) };
      if (kind === "send") await send({ data: base });
      if (kind === "edit") {
        if (!messageId) throw new Error("Enter the message ID to edit.");
        await edit({ data: { ...base, messageId } });
      }
      if (kind === "delete") {
        if (!messageId) throw new Error("Enter the message ID to delete.");
        await remove({ data: { guildId, channelId, messageId } });
      }
      toast.success(kind === "send" ? "Embed sent" : kind === "edit" ? "Message edited" : "Message deleted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Discord action failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="glass overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring"><MessageSquare size={21} /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Private control center</p><h1 className="font-display text-2xl font-bold">Discord Control</h1><p className="text-sm text-muted-foreground">Monitor your server and manage announcement messages without exposing your bot token.</p></div>
        </div>
      </header>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2"><Server size={15} className="text-muted-foreground" /><input value={guildId} onChange={e => setGuildId(e.target.value)} placeholder="Discord Server ID" className="input-base" /></div>
          <button onClick={() => void refresh()} disabled={busy} className="btn btn-primary"><RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Connect / refresh</button>
        </div>
        {status && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="admin-stat-tile glass rounded-2xl p-4"><Server size={16} className="text-primary" /><p className="mt-3 text-lg font-bold">{status.guild.name}</p><p className="text-xs text-muted-foreground">Connected server</p></div>
            <div className="admin-stat-tile glass rounded-2xl p-4"><Users size={16} className="text-primary" /><p className="mt-3 text-lg font-bold">{status.guild.approximate_member_count ?? "—"}</p><p className="text-xs text-muted-foreground">Members</p></div>
            <div className="admin-stat-tile glass rounded-2xl p-4"><Activity size={16} className="text-primary" /><p className="mt-3 text-lg font-bold">{status.guild.approximate_presence_count ?? "—"}</p><p className="text-xs text-muted-foreground">Online</p></div>
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><Bot size={17} className="text-primary" /><h2 className="font-display font-semibold">Embed builder</h2></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">Channel<select value={channelId} onChange={e => setChannelId(e.target.value)} className="input-base mt-1"><option value="">Select a channel</option>{status?.channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Message ID (for edit/delete)<input value={messageId} onChange={e => setMessageId(e.target.value)} placeholder="123456789012345678" className="input-base mt-1" /></label>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Embed title" className="input-base mt-3" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Embed description…" className="input-base mt-3 resize-y" />
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input value={content} onChange={e => setContent(e.target.value)} placeholder="Optional message content" className="input-base" /><input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void action("send")} disabled={busy} className="btn btn-primary"><Send size={15} /> Send embed</button>
          <button onClick={() => void action("edit")} disabled={busy} className="btn btn-ghost"><Check size={15} /> Edit message</button>
          <button onClick={() => void action("delete")} disabled={busy} className="btn btn-ghost text-destructive"><Trash2 size={15} /> Delete message</button>
        </div>
      </section>

      <section className="glass rounded-3xl p-4 text-xs text-muted-foreground">
        <Hash size={14} className="mb-2 inline text-primary" /> The bot token stays server-side. The bot must be in the server and have permission to view channels, send messages, manage messages, and embed links.
      </section>
    </div>
  );
}
