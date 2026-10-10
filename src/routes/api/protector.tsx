import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function serviceClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Protector server configuration is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireStaff(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const sb = serviceClient();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner", "staff"].includes(String(profile.role).toLowerCase())) return null;
  return { sb, user };
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/protector")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if (!access) return json({ error: "Unauthorized" }, 401);
          const { data, error } = await access.sb.from("protected_scripts")
            .select("id,name,enabled,expires_at,created_at,last_accessed_at")
            .order("created_at", { ascending: false });
          if (error) return json({ error: "Protector database unavailable", detail: error.message }, 503);
          return json({ scripts: data ?? [] });
        } catch {
          return json({ error: "Protector server configuration is missing" }, 503);
        }
      },
      POST: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if (!access) return json({ error: "Unauthorized" }, 401);
          const body = await request.json().catch(() => null) as { name?: unknown; source?: unknown; expiresAt?: unknown } | null;
          const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
          const source = typeof body?.source === "string" ? body.source : "";
          if (!name || !source.trim()) return json({ error: "Name and Lua source are required" }, 400);
          if (source.length > 1_000_000) return json({ error: "Script is too large (1 MB maximum)" }, 413);
          const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
          const tokenHash = await digest(token);
          const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
          const { data, error } = await access.sb.from("protected_scripts").insert({
            name, source, token_hash: tokenHash, enabled: true, expires_at: expiresAt,
          }).select("id,name,enabled,expires_at,created_at").single();
          if (error) return json({ error: "Could not save protected script", detail: error.message }, 503);
          return json({ script: data, token, loaderUrl: new URL("/api/protected/" + data.id + "?token=" + token, request.url).toString() }, 201);
        } catch {
          return json({ error: "Protector server configuration is missing" }, 503);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if (!access) return json({ error: "Unauthorized" }, 401);
          const body = await request.json().catch(() => null) as { id?: unknown; enabled?: unknown } | null;
          if (typeof body?.id !== "string" || typeof body.enabled !== "boolean") return json({ error: "Invalid update" }, 400);
          const { error } = await access.sb.from("protected_scripts").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", body.id);
          if (error) return json({ error: "Could not update script", detail: error.message }, 503);
          return json({ ok: true });
        } catch {
          return json({ error: "Protector server configuration is missing" }, 503);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if (!access) return json({ error: "Unauthorized" }, 401);
          const body = await request.json().catch(() => null) as { id?: unknown } | null;
          if (typeof body?.id !== "string") return json({ error: "Invalid script ID" }, 400);
          const { error } = await access.sb.from("protected_scripts").delete().eq("id", body.id);
          if (error) return json({ error: "Could not delete script", detail: error.message }, 503);
          return json({ ok: true });
        } catch {
          return json({ error: "Protector server configuration is missing" }, 503);
        }
      },
    },
  },
});
