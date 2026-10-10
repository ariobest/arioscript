import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/protected/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        if (!/^[a-f0-9]{64}$/.test(token)) {
          return new Response("", { status: 404, headers: { "cache-control": "no-store" } });
        }
        const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key) return new Response("Protector unavailable", { status: 503 });
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
        const hash = Array.from(new Uint8Array(hashBytes), b => b.toString(16).padStart(2, "0")).join("");
        const { data, error } = await sb.from("protected_scripts")
          .select("source,token_hash,enabled,expires_at")
          .eq("id", params.id).eq("token_hash", hash).maybeSingle();
        if (error || !data || !data.enabled || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) {
          return new Response("", { status: 404, headers: { "cache-control": "no-store" } });
        }
        await sb.from("protected_scripts").update({ last_accessed_at: new Date().toISOString() }).eq("id", params.id);
        return new Response(data.source, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store, no-cache, must-revalidate",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
