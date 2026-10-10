import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function serviceClient() {
  // The URL is public configuration; the service-role key must remain server-only.
  const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const missing = [
    ...(!url ? ["SUPABASE_URL (or VITE_SUPABASE_URL)"] : []),
    ...(!key ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ];
  if (missing.length) throw new Error("Missing server environment variable(s): " + missing.join(", "));
  return createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown server error";
  return json({ error: "Protector server error", detail: message }, 503);
}

type StaffAccess = { sb: ReturnType<typeof serviceClient> } | { error: string; status: number };

async function requireStaff(request: Request): Promise<StaffAccess> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { error: "Your login session was not sent. Refresh the page and sign in again.", status: 401 };

  const sb = serviceClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    return { error: "Your Supabase session is invalid or expired. Sign out, sign back in, and retry.", status: 401 };
  }

  // This matches the app's AuthProvider: roles are stored in public.user_roles.
  const { data: roles, error: roleError } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) {
    return { error: "Could not read your staff role from user_roles. Verify the table exists and the service-role key belongs to this Supabase project.", status: 503 };
  }
  const isStaff = (roles ?? []).some((row) => ["admin", "moderator"].includes(String(row.role).toLowerCase()));
  if (!isStaff) {
    return { error: "Your account has no admin or moderator role in user_roles. Add the correct role to your account, then sign in again.", status: 403 };
  }
  return { sb };
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

async function loadRawSource(rawUrl: string) {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { throw new Error("Enter a valid raw script URL"); }
  const allowedHosts = new Set([
    "raw.githubusercontent.com",
    "gist.githubusercontent.com",
    "pastebin.com",
    "paste.rs",
    "rentry.co",
    "arioscript.lovable.app",
    "arioscriptvault.netlify.app",
  ]);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname.toLowerCase()) || parsed.username || parsed.password) {
    throw new Error("Use an HTTPS raw link from GitHub Raw, GitHub Gist, Pastebin, paste.rs, Rentry, or your ARIO site");
  }
  if (parsed.hostname === "pastebin.com" && !parsed.pathname.startsWith("/raw/")) {
    throw new Error("Pastebin links must use the /raw/ URL");
  }
  const response = await fetch(parsed.toString(), {
    headers: { accept: "text/plain, application/octet-stream;q=0.9, */*;q=0.1" },
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Could not fetch raw link (HTTP " + response.status + ")");
  const contentType = response.headers.get("content-type") ?? "";
  if (/text\/html/i.test(contentType)) throw new Error("That link returned a webpage, not raw script text");
  const source = await response.text();
  if (!source.trim()) throw new Error("The raw link is empty");
  if (source.length > 1_000_000) throw new Error("Script is too large (1 MB maximum)");
  return source;
}

export const Route = createFileRoute("/api/protector")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if ("error" in access) return json({ error: access.error }, access.status);
          const { data, error } = await access.sb.from("protected_scripts")
            .select("id,name,enabled,expires_at,created_at,last_accessed_at")
            .order("created_at", { ascending: false });
          if (error) return json({ error: "Protector database unavailable", detail: error.message }, 503);
          return json({ scripts: data ?? [] });
        } catch (error) {
          return serverError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if ("error" in access) return json({ error: access.error }, access.status);
          const body = await request.json().catch(() => null) as { name?: unknown; source?: unknown; rawUrl?: unknown; expiresAt?: unknown } | null;
          const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
          const rawUrl = typeof body?.rawUrl === "string" ? body.rawUrl.trim() : "";
          let source = typeof body?.source === "string" ? body.source : "";
          if (!name || (!source.trim() && !rawUrl)) return json({ error: "Name and Lua source or raw URL are required" }, 400);
          if (rawUrl) {
            try { source = await loadRawSource(rawUrl); }
            catch (error) { return json({ error: error instanceof Error ? error.message : "Could not load raw URL" }, 400); }
          }
          if (!source.trim()) return json({ error: "The source is empty" }, 400);
          if (source.length > 1_000_000) return json({ error: "Script is too large (1 MB maximum)" }, 413);
          let expiresAt: string | null = null;
          if (typeof body?.expiresAt === "string" && body.expiresAt) {
            const parsedExpiry = new Date(body.expiresAt);
            if (!Number.isFinite(parsedExpiry.getTime()) || parsedExpiry.getTime() <= Date.now()) {
              return json({ error: "Expiry must be a valid future date" }, 400);
            }
            expiresAt = parsedExpiry.toISOString();
          }
          const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
          const tokenHash = await digest(token);
          const { data, error } = await access.sb.from("protected_scripts").insert({
            name, source, token_hash: tokenHash, enabled: true, expires_at: expiresAt,
          }).select("id,name,enabled,expires_at,created_at").single();
          if (error) return json({ error: "Could not save protected script", detail: error.message }, 503);
          return json({ script: data, token, loaderUrl: new URL("/api/protected/" + data.id + "?token=" + token, request.url).toString() }, 201);
        } catch (error) {
          return serverError(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if ("error" in access) return json({ error: access.error }, access.status);
          const body = await request.json().catch(() => null) as { id?: unknown; enabled?: unknown } | null;
          if (typeof body?.id !== "string" || typeof body.enabled !== "boolean") return json({ error: "Invalid update" }, 400);
          const { error } = await access.sb.from("protected_scripts").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", body.id);
          if (error) return json({ error: "Could not update script", detail: error.message }, 503);
          return json({ ok: true });
        } catch (error) {
          return serverError(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const access = await requireStaff(request);
          if ("error" in access) return json({ error: access.error }, access.status);
          const body = await request.json().catch(() => null) as { id?: unknown } | null;
          if (typeof body?.id !== "string") return json({ error: "Invalid script ID" }, 400);
          const { error } = await access.sb.from("protected_scripts").delete().eq("id", body.id);
          if (error) return json({ error: "Could not delete script", detail: error.message }, 503);
          return json({ ok: true });
        } catch (error) {
          return serverError(error);
        }
      },
    },
  },
});
