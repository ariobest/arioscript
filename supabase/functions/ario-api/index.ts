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
async function clientHash(req: Request): Promise<string | null> {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (!ip) return null;
  return await sha256(ip);
}
async function recordEvent(db: ReturnType<typeof createClient>, event: {
  script_id: string | null; event_type: string; status_code: number;
  client_hash?: string | null; metadata?: Record<string, unknown>;
}) {
  try {
    await db.from("protected_script_events").insert({
      script_id: event.script_id,
      event_type: event.event_type,
      status_code: event.status_code,
      client_hash: event.client_hash ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (error) {
    console.error("Could not record protected-script event:", error);
  }
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

  // Public token-protected loader. The website's /s/<id>.<key> route proxies here server-side.
  if (req.method === "GET" && id && secret) {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(secret)) return text("", 404);
    try {
      const db = adminDb();
      const client = await clientHash(req);
      const { data, error } = await db.from("protected_scripts")
        .select("source,enabled,expires_at,token_hash,rate_limit_per_minute")
        .eq("id", id).maybeSingle();
      if (error) {
        console.error("Loader database error:", error.message);
        return text("ARIO API database unavailable", 503);
      }
      if (!data) return text("", 404);

      // Per-script/per-client rolling minute limit. Requests without a trusted IP header
      // still receive token validation and auditing but are not assigned a shared global bucket.
      if (client) {
        const since = new Date(Date.now() - 60_000).toISOString();
        const { count, error: countError } = await db.from("protected_script_events")
          .select("id", { count: "exact", head: true })
          .eq("script_id", id).eq("client_hash", client).gte("created_at", since);
        if (countError) {
          console.error("Rate-limit query failed:", countError.message);
          return text("ARIO API rate-limit service unavailable", 503);
        }
        const limit = Math.max(1, Math.min(600, Number(data.rate_limit_per_minute) || 60));
        if ((count ?? 0) >= limit) {
          await recordEvent(db, { script_id: id, event_type: "loader_rate_limited", status_code: 429, client_hash: client });
          return text("ARIO loader rate limit exceeded", 429);
        }
      }

      const suppliedHash = await sha256(secret);
      if (suppliedHash !== data.token_hash || !data.enabled ||
          (data.expires_at && Date.parse(data.expires_at) <= Date.now())) {
        await recordEvent(db, { script_id: id, event_type: "loader_denied", status_code: 404, client_hash: client });
        return text("", 404);
      }

      await db.from("protected_scripts").update({ last_accessed_at: new Date().toISOString() }).eq("id", id);
      await recordEvent(db, { script_id: id, event_type: "loader_request", status_code: 200, client_hash: client });
      return text(data.source);
    } catch (e) {
      console.error("Loader error:", e);
      return text("ARIO API unavailable", 503);
    }
  }

  try {
    const access = await requireStaff(req);
    if ("error" in access) return json({ error: access.error, ...( "detail" in access ? { detail: access.detail } : {}) }, access.status);
    const db = access.db;

    if (req.method === "GET") {
      if (url.searchParams.get("action") === "versions") {
        const targetId = url.searchParams.get("id") ?? "";
        if (!/^[a-f0-9-]{36}$/i.test(targetId)) return json({ error: "A valid script ID is required." }, 400);
        const { data, error } = await db.from("protected_script_versions")
          .select("id,script_id,version,name,change_note,created_at,created_by")
          .eq("script_id", targetId).order("version", { ascending: false }).limit(100);
        if (error) return json({ error: "Could not read version history", detail: error.message }, 503);
        return json({ versions: data ?? [] });
      }
      if (url.searchParams.get("action") === "events") {
        const { data, error } = await db.from("protected_script_events")
          .select("id,script_id,event_type,status_code,metadata,created_at")
          .order("created_at", { ascending: false }).limit(100);
        if (error) return json({ error: "Could not read audit events", detail: error.message }, 503);
        return json({ events: data ?? [] });
      }
      const { data, error } = await db.from("protected_scripts")
        .select("id,name,enabled,expires_at,created_at,last_accessed_at,version,rate_limit_per_minute,disabled_reason")
        .order("created_at", { ascending: false });
      if (error) return json({ error: "Could not read API scripts", detail: error.message }, 503);
      return json({ scripts: data ?? [] });
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null) as { action?: unknown; id?: unknown; name?: unknown; source?: unknown; rawUrl?: unknown; expiresAt?: unknown } | null;
      if (body?.action === "rotate") {
        if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id)) {
          return json({ error: "Choose a valid API script." }, 400);
        }
        const { data: existing, error: lookupError } = await db.from("protected_scripts")
          .select("id,name,enabled").eq("id", body.id).maybeSingle();
        if (lookupError) return json({ error: "Could not find API script", detail: lookupError.message }, 503);
        if (!existing) return json({ error: "That API script no longer exists. Refresh the list." }, 404);
        if (!existing.enabled) return json({ error: "This API script is disabled. Enable it before generating a loader." }, 409);
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
        const { error: rotateError } = await db.from("protected_scripts")
          .update({ token_hash: await sha256(token), updated_at: new Date().toISOString() })
          .eq("id", body.id);
        if (rotateError) return json({ error: "Could not generate a fresh loader token", detail: rotateError.message }, 503);
        return json({ script: existing, loaderUrl: `${FUNCTION_URL}?id=${encodeURIComponent(existing.id)}&token=${token}` });
      }
      if (body?.action === "restore") {
        if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) ||
            typeof body.versionId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.versionId)) {
          return json({ error: "A valid script and version are required." }, 400);
        }
        const { data: current, error: currentError } = await db.from("protected_scripts")
          .select("id,version").eq("id", body.id).maybeSingle();
        if (currentError) return json({ error: "Could not load current script", detail: currentError.message }, 503);
        if (!current) return json({ error: "Script not found." }, 404);
        const { data: snapshot, error: snapshotError } = await db.from("protected_script_versions")
          .select("name,source,version").eq("id", body.versionId).eq("script_id", body.id).maybeSingle();
        if (snapshotError) return json({ error: "Could not read version snapshot", detail: snapshotError.message }, 503);
        if (!snapshot) return json({ error: "That version does not exist for this script." }, 404);
        const nextVersion = (Number(current.version) || 1) + 1;
        const { error: updateError } = await db.from("protected_scripts").update({
          name: snapshot.name, source: snapshot.source, version: nextVersion, updated_at: new Date().toISOString(),
        }).eq("id", body.id);
        if (updateError) return json({ error: "Could not restore version", detail: updateError.message }, 503);
        const { error: versionError } = await db.from("protected_script_versions").insert({
          script_id: body.id, version: nextVersion, name: snapshot.name, source: snapshot.source,
          change_note: `Rollback to version ${snapshot.version}`,
        });
        if (versionError) return json({ error: "Restored source, but could not record the rollback snapshot.", detail: versionError.message }, 503);
        await recordEvent(db, { script_id: body.id, event_type: "script_rollback", status_code: 200, metadata: { fromVersion: snapshot.version, toVersion: nextVersion } });
        return json({ ok: true, version: nextVersion });
      }
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
        version: 1, rate_limit_per_minute: 60,
      }).select("id,name,enabled,expires_at,created_at,version,rate_limit_per_minute").single();
      if (error) return json({ error: "Could not create API script", detail: error.message }, 503);
      const { error: versionError } = await db.from("protected_script_versions").insert({
        script_id: data.id, version: 1, name, source, change_note: "Initial version",
      });
      if (versionError) {
        console.error("Initial version snapshot could not be saved:", versionError.message);
      }
      await recordEvent(db, { script_id: data.id, event_type: "script_created", status_code: 201 });
      return json({ script: data, loaderUrl: `${FUNCTION_URL}?id=${encodeURIComponent(data.id)}&token=${token}` }, 201);
    }
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null) as {
        id?: unknown; enabled?: unknown; name?: unknown; source?: unknown;
        changeNote?: unknown; rateLimitPerMinute?: unknown; disabledReason?: unknown;
      } | null;
      if (typeof body?.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id)) return json({ error: "A valid script ID is required." }, 400);
      const { data: existing, error: existingError } = await db.from("protected_scripts")
        .select("id,name,source,version,enabled,rate_limit_per_minute").eq("id", body.id).maybeSingle();
      if (existingError) return json({ error: "Could not load API script", detail: existingError.message }, 503);
      if (!existing) return json({ error: "API script not found." }, 404);

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.enabled === "boolean") update.enabled = body.enabled;
      if (typeof body.name === "string") {
        const nextName = body.name.trim().slice(0, 100);
        if (!nextName) return json({ error: "Script name cannot be empty." }, 400);
        update.name = nextName;
      }
      if (typeof body.source === "string") {
        if (!body.source.trim()) return json({ error: "Script source cannot be empty." }, 400);
        if (body.source.length > 1_000_000) return json({ error: "Script size limit is 1 MB." }, 413);
        update.source = body.source;
      }
      if (typeof body.rateLimitPerMinute === "number") {
        if (!Number.isInteger(body.rateLimitPerMinute) || body.rateLimitPerMinute < 1 || body.rateLimitPerMinute > 600) {
          return json({ error: "Rate limit must be an integer from 1 to 600 requests per minute." }, 400);
        }
        update.rate_limit_per_minute = body.rateLimitPerMinute;
      }
      if (typeof body.disabledReason === "string") update.disabled_reason = body.disabledReason.slice(0, 300);
      const sourceChanged = (typeof body.source === "string" && body.source !== existing.source) ||
        (typeof body.name === "string" && body.name.trim() !== existing.name);
      if (sourceChanged) update.version = (Number(existing.version) || 1) + 1;
      const { error } = await db.from("protected_scripts").update(update).eq("id", body.id);
      if (error) return json({ error: "Could not update API script", detail: error.message }, 503);
      if (sourceChanged) {
        const nextVersion = Number(update.version);
        const { error: versionError } = await db.from("protected_script_versions").insert({
          script_id: body.id, version: nextVersion,
          name: typeof update.name === "string" ? update.name : existing.name,
          source: typeof update.source === "string" ? update.source : existing.source,
          change_note: typeof body.changeNote === "string" ? body.changeNote.slice(0, 300) : "Updated script",
        });
        if (versionError) return json({ error: "Script was updated, but its version snapshot could not be saved.", detail: versionError.message }, 503);
      }
      if (typeof body.enabled === "boolean" && body.enabled !== existing.enabled) {
        await recordEvent(db, { script_id: body.id, event_type: body.enabled ? "script_enabled" : "script_disabled", status_code: 200 });
      } else {
        await recordEvent(db, { script_id: body.id, event_type: sourceChanged ? "script_version_published" : "script_settings_updated", status_code: 200 });
      }
      return json({ ok: true, version: update.version ?? existing.version });
    }
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null) as { id?: unknown } | null;
      if (typeof body?.id !== "string") return json({ error: "Script ID is required." }, 400);
      const { error } = await db.from("protected_scripts").delete().eq("id", body.id);
      if (error) return json({ error: "Could not delete API script", detail: error.message }, 503);
      await recordEvent(db, { script_id: null, event_type: "script_deleted", status_code: 200, metadata: { scriptId: body.id } });
      return json({ ok: true });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (e) {
    console.error("ARIO API error:", e);
    return json({ error: "ARIO API server error", detail: e instanceof Error ? e.message : "Unknown error" }, 503);
  }
});