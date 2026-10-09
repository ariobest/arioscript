import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = String(params.slug ?? "").toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return new Response("-- not found", { status: 404, headers });
        const sb = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        // Browser protection deters casual viewing; it is not source-code DRM.
        const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
        const rpc = acceptsHtml ? "get_raw_script_browser" : "get_raw_script";
        const { data, error } = await sb.rpc(rpc, { _slug: slug });
        if (error) return new Response("-- raw script unavailable", { status: 500, headers });
        if (data == null) return new Response("-- not found", { status: 404, headers });
        return new Response(data as string, { status: 200, headers });
      },
    },
  },
});
