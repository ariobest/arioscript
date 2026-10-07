import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const API = "https://discord.com/api/v10";
const input = z.object({ guildId: z.string().regex(/^\\d{17,20}$/) });
const channelInput = input.extend({ channelId: z.string().regex(/^\\d{17,20}$/) });
const embedInput = channelInput.extend({
  content: z.string().max(2000).optional(),
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.number().int().min(0).max(0xffffff).default(0x5865f2),
  messageId: z.string().regex(/^\\d{17,20}$/).optional(),
});

async function discord(path: string, init: RequestInit = {}) {
  const token = process.env["DISCORD_BOT_TOKEN"] ?? process.env["DISCORD_TOKEN"];
  if (!token) throw new Error("Discord bot token is not configured on the server.");
  const response = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    let message = `Discord API error (${response.status}).`;
    try { const json = JSON.parse(body) as { message?: string }; if (json.message) message = json.message; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const getDiscordStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(data => input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Administrator access required.");
    const [guild, channels] = await Promise.all([
      discord(`/guilds/${data.guildId}?with_counts=true`),
      discord(`/guilds/${data.guildId}/channels`),
    ]);
    const textChannels = (channels as Array<{ id: string; name: string; type: number }>).filter(c => c.type === 0);
    return {
      guild: guild as { id: string; name: string; icon?: string | null; approximate_member_count?: number; approximate_presence_count?: number },
      channels: textChannels.map(c => ({ id: c.id, name: c.name })),
    };
  });

export const sendDiscordEmbed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(data => embedInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Administrator access required.");
    const embeds = [{ title: data.title || undefined, description: data.description || undefined, color: data.color }];
    return await discord(`/channels/${data.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: data.content || undefined, embeds }),
    });
  });

export const editDiscordEmbed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(data => embedInput.required({ messageId: true }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Administrator access required.");
    const embeds = [{ title: data.title || undefined, description: data.description || undefined, color: data.color }];
    return await discord(`/channels/${data.channelId}/messages/${data.messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: data.content || undefined, embeds }),
    });
  });

export const deleteDiscordMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(data => channelInput.extend({ messageId: z.string().regex(/^\\d{17,20}$/) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Administrator access required.");
    await discord(`/channels/${data.channelId}/messages/${data.messageId}`, { method: "DELETE" });
    return { ok: true };
  });
