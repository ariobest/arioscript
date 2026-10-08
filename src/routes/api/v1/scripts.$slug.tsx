import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

export const Route = createFileRoute("/api/v1/scripts/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing API key" }), {
            status: 401,
            headers,
          });
        }

        const sb = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false } }
        );

        const { data, error } = await sb.rpc("api_get_script", {
          _api_key: key,
          _slug: params.slug,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: error.message.includes("Invalid API key") ? 401 : 500,
            headers,
          });
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers,
        });
      },
    },
  },
});
