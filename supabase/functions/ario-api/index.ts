import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://yxbzblbtzqioexszjjkc.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("ARIO_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ario-api`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});
const text = (body: string, status = 200) => new Response(body, {
  status, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
});

function adminDb() {
  if (!SERVICE_ROLE_KEY) throw new Error("Missing ARIO_SERVICE_ROLE_KEY secret for ario-api.");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function requireStaff(req: Request) {
  const bearer = req.headers.get("authorization") ?? "";
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Sign in as an administrator first.", status: 401 } as const;
  const db = adminDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { error: "Your session expired. Sign in again.", status: 401 } as const;
  const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", data.user.id);
  if (roleError) return { error: "Could not verify staff access in public.user_roles.", detail: roleError.message, status: 503 } as const;
  if (!(roles ?? []).some(r => ["admin", "moderator"].includes(String(r.role).toLowerCase()))) {
    return { error: "Admin or moderator access is required.", status: 403 } as const;
  }
  return { db } as const;
}
async function importRaw(rawUrl: string) {
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new Error("Enter a valid HTTPS raw URL."); }
  const allowed = new Set(["raw.githubusercontent.com", "gist.githubusercontent.com", "pastebin.com", "paste.rs", "rentry.co"]);
  if (u.protocol !== "https:" || !allowed.has(u.hostname.toLowerCase()) || u.username || u.password) {
    throw new Error("Use HTTPS from GitHub Raw, GitHub Gist, Pastebin /raw, paste.rs, or Rentry.");
  }
  if (u.hostname === "pastebin.com" && !u.pathname.startsWith("/raw/")) throw new Error("Pastebin links must use /raw/.");
  const response = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Raw URL returned HTTP ${response.status}.`);
  if (/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new Error("The URL returned a webpage, not raw text.");
  const source = await response.text();
  if (!source.trim()) throw new Error("The raw script is empty.");
  if (source.length > 1_000_000) throw new Error("Script size limit is 1 MB.");
  return source;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const secret = url.searchParams.get("token");

  // Public health check: opening the base function URL should not return a misleading 404.
  if (req.method === "GET" && !id && !secret && !req.headers.has("authorization")) {
    return json({ ok: true, service: "ario-api", status: "online", version: 6, endpoints: {
      health: FUNCTION_URL, loader: "GET ?id=<script-id>&token=<secret>", management: "Requires a signed-in admin/moderator"
    }});
  }

  // Token-protected loader.
  if (req.method === "GET" && id && secret) {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(secret)) return text("", 404);
    try {
      const db = adminDb();
      const tokenHash = await sha256(secret);
      const { data, error } = await db.from("protected_scripts")
        .select("source,enabled,expires_at").eq("id", id).eq("token_hash", tokenHash).maybeSingle();
      if (error) {
        console.error("Loader database error:", error.message);
        return text("ARIO API database unavailable", 503);
      }
      if (!data || !data.enabled || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) return text("", 404);
      await db.from("protected_scripts").update({ last_accessed_at: new Date().toISOString() }).eq("id", id);
      return text(data.source);
    } catch (e) {
      console.error("Loader error:", e);
      return text(e instanceof Error ? e.message : "ARIO API unavailable", 503);
    }
  }

  try {
    const access = await requireStaff(req);
    if ("error" in access) return json({ error: access.error, ...( "detail" in access ? { detail: access.detail } : {}) }, access.status);
    const db = access.db;

    if (req.method === "GET") {
      const { data, error } = await db.from("protected_scripts")
        .select("id,name,enabled,expires_at,created_at,last_accessed_at").order("created_at", { ascending: false });
      if (error) return json({ error: "Could not read API scripts", detail: error.message }, 503);
      return json({ scripts: data ?? [] });
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null) as { name?: unknown; source?: unknown; rawUrl?: unknown; expiresAt?: unknown } | null;
      const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
      let source = typeof body?.source === "string" ? body.source : "";
      const rawUrl = typeof body?.rawUrl === "string" ? body.rawUrl.trim() : "";
      if (!name || (!source.trim() && !rawUrl)) return json({ error: "Script name and Lua source or raw URL are required." }, 400);
      if (rawUrl) {
        try { source = await importRaw(rawUrl); }
        catch (e) { return json({ error: e instanceof Error ? e.message : "Could not import raw URL." }, 400); }
      }
      if (!source.trim()) return json({ error: "Lua source is empty." }, 400);
      if (source.length > 1_000_000) return json({ error: "Script size limit is 1 MB." }, 413);
      let expiresAt: string | null = null;
      if (typeof body?.expiresAt === "string" && body.expiresAt) {
        const d = new Date(body.expiresAt);
        if (!Number.isFinite(d.getTime()) || d.getTime() <= Date.now()) return json({ error: "Expiry must be a future date." }, 400);
        expiresAt = d.toISOString();
      }
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      const { data, error } = await db.from("protected_scripts").insert({
        name, source, token_hash: await sha256(token), enabled: true, expires_at: expiresAt,
      }).select("id,name,enabled,expires_at,created_at").single();
      if (error) return json({ error: "Could not create API script", detail: error.message }, 503);
      return json({ script: data, loaderUrl: `${FUNCTION_URL}?id=${encodeURIComponent(data.id)}&token=${token}` }, 201);
    }
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null) as { id?: unknown; enabled?: unknown } | null;
      if (typeof body?.id !== "string" || typeof body.enabled !== "boolean") return json({ error: "Script ID and enabled status are required." }, 400);
      const { error } = await db.from("protected_scripts").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", body.id);
      if (error) return json({ error: "Could not update API script", detail: error.message }, 503);
      return json({ ok: true });
    }
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null) as { id?: unknown } | null;
      if (typeof body?.id !== "string") return json({ error: "Script ID is required." }, 400);
      const { error } = await db.from("protected_scripts").delete().eq("id", body.id);
      if (error) return json({ error: "Could not delete API script", detail: error.message }, 503);
      return json({ ok: true });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (e) {
    console.error("ARIO API error:", e);
    return json({ error: "ARIO API server error", detail: e instanceof Error ? e.message : "Unknown error" }, 503);
  }
});