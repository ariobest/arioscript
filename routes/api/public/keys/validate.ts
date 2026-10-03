import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

async function check(raw: string | null) {
  const key = (raw ?? "").trim().toUpperCase();
  if (!/^ARIO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(key)) return new Response(JSON.stringify({ valid: false }), { status: 200, headers });
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("validate_key", { _key: key });
  if (error) return new Response(JSON.stringify({ valid: false, error: "unavailable" }), { status: 503, headers });
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export const Route = createFileRoute("/api/public/keys/validate")({
  server: {
    handlers: {
      GET: async ({ request }) => check(new URL(request.url).searchParams.get("key")),
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        return check(typeof body?.key === "string" ? body.key : null);
      },
    },
  },
});
