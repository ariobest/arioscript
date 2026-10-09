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
        // Casual browser deterrent only. Request headers can be spoofed, so this is not real access control.
        const userAgent = request.headers.get("user-agent") ?? "";
        const fetchDest = request.headers.get("sec-fetch-dest") ?? "";
        const accept = request.headers.get("accept") ?? "";
        const looksLikeBrowser =
          request.mode === "navigate" ||
          (/(mozilla|chrome|safari|firefox|edg)/i.test(userAgent) &&
            (fetchDest === "document" || accept.includes("text/html")));
        if (looksLikeBrowser) return new Response("", { status: 200, headers });

        const slug = String(params.slug ?? "").toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return new Response("-- not found", { status: 404, headers });
        const sb = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await sb.rpc("get_raw_script", { _slug: slug });
        if (error) return new Response("-- raw script unavailable", { status: 500, headers });
        if (data == null) return new Response("-- not found", { status: 404, headers });
        return new Response(data as string, { status: 200, headers });
      },
    },
  },
});
