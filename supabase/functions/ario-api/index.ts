import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ario-api` : "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });

function client() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY function secret");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function staffClient(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Sign in as an administrator first.", status: 401 } as const;
  const sb = client();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: "Your session expired. Sign in again.", status: 401 } as const;
  const { data: roles, error: roleError } = await sb.from("user_roles").select("role").eq("user_id", data.user.id);
  if (roleError) return { error: "Could not verify staff access. Check public.user_roles.", status: 503 } as const;
  if (!(roles ?? []).some((r) => ["admin", "moderator"].includes(String(r.role).toLowerCase()))) {
    return { error: "Admin or moderator access is required.", status: 403 } as const;
  }
  return { sb } as const;
}
async function loadRawSource(rawUrl: string) {
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new Error("Enter a valid HTTPS raw URL."); }
  const allowed = new Set(["raw.githubusercontent.com", "gist.githubusercontent.com", "pastebin.com", "paste.rs", "rentry.co"]);
  if (u.protocol !== "https:" || !allowed.has(u.hostname.toLowerCase()) || u.username || u.password) {
    throw new Error("Use an HTTPS link from GitHub Raw, GitHub Gist, Pastebin, paste.rs, or Rentry.");
  }
  if (u.hostname === "pastebin.com" && !u.pathname.startsWith("/raw/")) throw new Error("Pastebin links must use /raw/.");
  const response = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Raw link returned HTTP ${response.status}.`);
  if (/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new Error("That link returned a webpage, not raw script text.");
  const source = await response.text();
  if (!source.trim()) throw new Error("The raw script is empty.");
  if (source.length > 1_000_000) throw new Error("Script size limit is 1 MB.");
  return source;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  // Public loader: only an ID plus its random per-script token can retrieve source.
  if (req.method === "GET" && id && token) {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(token)) return text("", 404);
    try {
      const sb = client();
      const hash = await sha256(token);
      const { data, error } = await sb.from("protected_scripts")
        .select("source,enabled,expires_at")
        .eq("id", id).eq("token_hash", hash).maybeSingle();
      if (error || !data || !data.enabled || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) return text("", 404);
      await sb.from("protected_scripts").update({ last_accessed_at: new Date().toISOString() }).eq("id", id);
      return text(data.source);
    } catch (error) {
      console.error("Loader error:", error);
      return text("ARIO API unavailable", 503);
    }
  }

  // All management operations require a valid Supabase user session and staff role.
  try {
    const access = await staffClient(req);
    if ("error" in access) return json({ error: access.error }, access.status);
    const sb = access.sb;

    if (req.method === "GET") {
      const { data, error } = await sb.from("protected_scripts")
        .select("id,name,enabled,expires_at,created_at,last_accessed_at")
        .order("created_at", { ascending: false });
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
        try { source = await loadRawSource(rawUrl); }
        catch (e) { return json({ error: e instanceof Error ? e.message : "Could not import raw URL." }, 400); }
      }
      if (!source.trim()) return json({ error: "Lua source is empty." }, 400);
      if (source.length > 1_000_000) return json({ error: "Script size limit is 1 MB." }, 413);
      let expiresAt: string | null = null;
      if (typeof body?.expiresAt === "string" && body.expiresAt) {
        const expiry = new Date(body.expiresAt);
        if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) return json({ error: "Expiry must be a future date." }, 400);
        expiresAt = expiry.toISOString();
      }
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      const { data, error } = await sb.from("protected_scripts").insert({
        name, source, token_hash: await sha256(secret), enabled: true, expires_at: expiresAt,
      }).select("id,name,enabled,expires_at,created_at").single();
      if (error) return json({ error: "Could not create API script", detail: error.message }, 503);
      const loaderUrl = `${FUNCTION_URL}?id=${encodeURIComponent(data.id)}&token=${secret}`;
      return json({ script: data, token: secret, loaderUrl }, 201);
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null) as { id?: unknown; enabled?: unknown } | null;
      if (typeof body?.id !== "string" || typeof body.enabled !== "boolean") return json({ error: "Script ID and enabled status are required." }, 400);
      const { error } = await sb.from("protected_scripts").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", body.id);
      if (error) return json({ error: "Could not update API script", detail: error.message }, 503);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null) as { id?: unknown } | null;
      if (typeof body?.id !== "string") return json({ error: "Script ID is required." }, 400);
      const { error } = await sb.from("protected_scripts").delete().eq("id", body.id);
      if (error) return json({ error: "Could not delete API script", detail: error.message }, 503);
      return json({ ok: true });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("ARIO API error:", error);
    return json({ error: "ARIO API server error", detail: error instanceof Error ? error.message : "Unknown error" }, 503);
  }
});
