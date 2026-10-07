import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Activity, Bot, Check, Code2, Copy, Eye, Hash, MessageSquare, RefreshCw, Send, Server, Shield, Trash2, Users, Volume2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { deleteDiscordMessage, editDiscordEmbed, editDiscordJson, getDiscordStatus, sendDiscordEmbed, sendDiscordJson } from "@/lib/discord.functions";

export const Route = createFileRoute("/admin/discord")({
  head: () => ({ meta: [{ title: "Discord Control — ARIO SCRIPTS" }, { name: "description", content: "Private ARIO Discord server control center." }] }),
  component: DiscordControl,
});

const DEFAULT_JSON = {
  content: "",
  embeds: [{ title: "ARIO Announcement", description: "Your announcement goes here.", color: 5793266, footer: { text: "ARIO SCRIPTS" } }]
};

function DiscordControl() {
  const [guildId, setGuildId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [title, setTitle] = useState("ARIO Announcement");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#5865f2");
  const [json, setJson] = useState(JSON.stringify(DEFAULT_JSON, null, 2));
  const [mode, setMode] = useState<"builder" | "json">("builder");
  const [busy, setBusy] = useState(false);

  const load = useServerFn(getDiscordStatus);
  const send = useServerFn(sendDiscordEmbed);
  const edit = useServerFn(editDiscordEmbed);
  const remove = useServerFn(deleteDiscordMessage);
  const sendJson = useServerFn(sendDiscordJson);
  const editJson = useServerFn(editDiscordJson);

  const jsonState = useMemo(() => {
    try { return { value: JSON.parse(json), error: "" }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : "Invalid JSON" }; }
  }, [json]);

  function syncBuilderToJson() {
    setJson(JSON.stringify({ content, embeds: [{ title: title || undefined, description: description || undefined, color: parseInt(color.replace("#", ""), 16) }] }, null, 2));
  }

  function syncJsonToBuilder() {
    if (!jsonState.value) return toast.error("Fix the JSON syntax first.");
    const value = jsonState.value as any;
    const embed = Array.isArray(value.embeds) ? value.embeds[0] : undefined;
    setContent(typeof value.content === "string" ? value.content : "");
    setTitle(embed?.title || "");
    setDescription(embed?.description || "");
    if (typeof embed?.color === "number") setColor("#" + embed.color.toString(16).padStart(6, "0"));
  }

  async function refresh() {
    if (!/^\d{17,20}$/.test(guildId)) return toast.error("Enter a valid Discord server ID.");
    setBusy(true);
    try {
      const result = await load({ data: { guildId } });
      setStatus(result);
      if (!channelId && result.channels[0]) setChannelId(result.channels[0].id);
      toast.success("Discord server loaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load Discord."); }
    finally { setBusy(false); }
  }

  async function action(kind: "send" | "edit" | "delete") {
    if (!channelId) return toast.error("Choose a channel.");
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

  async function jsonAction(kind: "send" | "edit") {
    if (!jsonState.value) return toast.error("Fix the JSON syntax first.");
    if (!channelId) return toast.error("Choose a channel.");
    if (kind === "edit" && !messageId) return toast.error("Enter the message ID to edit.");
    setBusy(true);
    try {
      if (kind === "send") await sendJson({ data: { guildId, channelId, payload: jsonState.value as Record<string, unknown> } });
      else await editJson({ data: { guildId, channelId, messageId, payload: jsonState.value as Record<string, unknown> } });
      toast.success(kind === "send" ? "JSON message sent" : "JSON message edited");
    } catch (e) { toast.error(e instanceof Error ? e.message : "JSON Discord action failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="glass overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary glow-ring"><MessageSquare size={21}/></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Private control center</p><h1 className="font-display text-2xl font-bold">Discord Control</h1><p className="text-sm text-muted-foreground">Server viewer, JSON embed editor, message controls and live server stats.</p></div>
        </div>
      </header>

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2"><Server size={15} className="text-muted-foreground"/><input value={guildId} onChange={e=>setGuildId(e.target.value)} placeholder="Discord Server ID" className="input-base"/></div>
          <button onClick={()=>void refresh()} disabled={busy} className="btn btn-primary"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/> Connect / refresh</button>
        </div>
        {status && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-stat-tile glass rounded-2xl p-4"><Server size={16} className="text-primary"/><p className="mt-3 text-lg font-bold">{status.guild.name}</p><p className="text-xs text-muted-foreground">Server</p></div>
          <div className="admin-stat-tile glass rounded-2xl p-4"><Users size={16} className="text-primary"/><p className="mt-3 text-lg font-bold">{status.guild.approximate_member_count ?? "—"}</p><p className="text-xs text-muted-foreground">Members</p></div>
          <div className="admin-stat-tile glass rounded-2xl p-4"><Wifi size={16} className="text-primary"/><p className="mt-3 text-lg font-bold">{status.guild.approximate_presence_count ?? "—"}</p><p className="text-xs text-muted-foreground">Online</p></div>
          <div className="admin-stat-tile glass rounded-2xl p-4"><Shield size={16} className="text-primary"/><p className="mt-3 text-lg font-bold">{status.guild.premium_tier ?? 0}</p><p className="text-xs text-muted-foreground">Boost level</p></div>
        </div>}
      </section>

      {status && <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="glass rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2"><Hash size={17} className="text-primary"/><h2 className="font-display font-semibold">Server viewer</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/20 p-4"><p className="text-xs text-muted-foreground">Text channels</p><p className="mt-1 text-xl font-bold">{status.channels.length}</p></div>
            <div className="rounded-2xl border border-border/60 bg-background/20 p-4"><p className="text-xs text-muted-foreground">Voice channels</p><p className="mt-1 text-xl font-bold">{status.voiceChannels.length}</p></div>
            <div className="rounded-2xl border border-border/60 bg-background/20 p-4"><p className="text-xs text-muted-foreground">Categories</p><p className="mt-1 text-xl font-bold">{status.categories.length}</p></div>
            <div className="rounded-2xl border border-border/60 bg-background/20 p-4"><p className="text-xs text-muted-foreground">Roles</p><p className="mt-1 text-xl font-bold">{status.roles.length}</p></div>
          </div>
          <div className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1">
            {status.categories.map((cat: any) => <div key={cat.id} className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-xs font-bold text-primary">⌄ {cat.name}</div>)}
            {status.channels.map((ch: any) => <button key={ch.id} onClick={()=>setChannelId(ch.id)} className={"flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition " + (channelId===ch.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}><Hash size={13}/>{ch.name}</button>)}
            {status.voiceChannels.map((ch: any) => <div key={ch.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground"><Volume2 size={13}/>{ch.name}</div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{status.roles.slice(0, 12).map((role: any)=><span key={role.id} className="chip text-xs">@{role.name}</span>)}</div>
        </div>
        <div className="glass rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2"><Activity size={17} className="text-primary"/><h2 className="font-display font-semibold">Server details</h2></div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between rounded-xl bg-background/20 p-3"><span className="text-muted-foreground">Verification level</span><b>{status.guild.verification_level ?? 0}</b></div>
            <div className="flex justify-between rounded-xl bg-background/20 p-3"><span className="text-muted-foreground">Premium tier</span><b>{status.guild.premium_tier ?? 0}</b></div>
            <div className="rounded-xl bg-background/20 p-3"><p className="text-muted-foreground">Features</p><div className="mt-2 flex flex-wrap gap-1">{(status.guild.features ?? []).map((x: string)=><span key={x} className="chip text-[10px]">{x}</span>)}</div></div>
            {status.guild.description && <div className="rounded-xl bg-background/20 p-3 text-muted-foreground">{status.guild.description}</div>}
          </div>
        </div>
      </section>}

      <section className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><Bot size={17} className="text-primary"/><h2 className="font-display font-semibold">Embed / message editor</h2><div className="ml-auto flex gap-2"><button className={"btn " + (mode==="builder" ? "btn-primary" : "btn-ghost")} onClick={()=>{syncJsonToBuilder();setMode("builder")}}><Eye size={14}/> Builder</button><button className={"btn " + (mode==="json" ? "btn-primary" : "btn-ghost")} onClick={()=>{syncBuilderToJson();setMode("json")}}><Code2 size={14}/> JSON</button></div></div>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">
          <div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted-foreground">Channel<select value={channelId} onChange={e=>setChannelId(e.target.value)} className="input-base mt-1"><option value="">Select a channel</option>{status?.channels.map((c: any)=><option key={c.id} value={c.id}>#{c.name}</option>)}</select></label><label className="text-xs font-semibold text-muted-foreground">Message ID<input value={messageId} onChange={e=>setMessageId(e.target.value)} placeholder="For edit/delete" className="input-base mt-1"/></label></div>
            {mode === "builder" ? <><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Embed title" className="input-base mt-3"/><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={6} placeholder="Embed description…" className="input-base mt-3 resize-y"/><div className="mt-3 grid grid-cols-[1fr_auto] gap-3"><input value={content} onChange={e=>setContent(e.target.value)} placeholder="Optional message content" className="input-base"/><input type="color" value={color} onChange={e=>setColor(e.target.value)} className="h-11 w-14 rounded-xl border border-border bg-transparent p-1"/></div></> : <><textarea value={json} onChange={e=>setJson(e.target.value)} rows={16} spellCheck={false} className="input-base mt-3 min-h-[360px] resize-y font-mono text-xs"/><p className={"mt-2 text-xs " + (jsonState.error ? "text-destructive" : "text-emerald-400")}>{jsonState.error || "Valid JSON payload"}</p></>}
            <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void (mode==="json" ? jsonAction("send") : action("send"))} disabled={busy} className="btn btn-primary"><Send size={14}/>Send</button><button onClick={()=>void (mode==="json" ? jsonAction("edit") : action("edit"))} disabled={busy} className="btn btn-ghost"><Check size={14}/>Edit</button><button onClick={()=>void action("delete")} disabled={busy} className="btn btn-ghost text-destructive"><Trash2 size={14}/>Delete</button><button onClick={()=>copyText(mode==="json" ? json : JSON.stringify({content,embeds:[{title,description,color:parseInt(color.replace("#",""),16)}]},null,2))} className="btn btn-ghost"><Copy size={14}/>Copy JSON</button></div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-[#0b0d14] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Live Discord preview</p>
            <div className="mt-4 rounded-2xl border-l-4 border-primary bg-[#171922] p-4 shadow-2xl"><p className="text-xs text-white/50">ARIO SCRIPTS</p><h3 className="mt-2 text-lg font-bold text-white">{mode==="json" ? (jsonState.value as any)?.embeds?.[0]?.title || "Embed title" : title || "Embed title"}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{mode==="json" ? (jsonState.value as any)?.embeds?.[0]?.description || "Embed description" : description || "Embed description"}</p><div className="mt-4 flex items-center justify-between text-[10px] text-white/35"><span>{channelId ? "Channel selected" : "Select a channel"}</span><span>JSON • Live</span></div></div>
            <p className="mt-4 text-xs text-muted-foreground">Supports Discord-style message JSON, embeds, fields, footer, thumbnails and images. The bot token stays server-side.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function copyText(value: string) {
  navigator.clipboard.writeText(value).then(() => toast.success("Copied")).catch(() => toast.error("Clipboard access was blocked."));
}
