import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const apiKey = (url.searchParams.get("key") ?? "").trim();

        // Keep ordinary browser navigation blank as a casual deterrent; the API-key check below is the actual gate.
        const userAgent = request.headers.get("user-agent") ?? "";
        const fetchDest = request.headers.get("sec-fetch-dest") ?? "";
        const accept = request.headers.get("accept") ?? "";
        const looksLikeBrowser =
          request.mode === "navigate" ||
          (/(mozilla|chrome|safari|firefox|edg)/i.test(userAgent) &&
            (fetchDest === "document" || accept.includes("text/html")));
        if (looksLikeBrowser) return new Response("", { status: 200, headers });

        const slug = String(params.slug ?? "").trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
          return new Response("-- script not found", { status: 404, headers });
        }
        if (!apiKey) {
          return new Response("-- valid ARIO API key required", { status: 401, headers });
        }

        const supabaseUrl = (process.env["SUPABASE_URL"] ?? "").replace(/\/+$/, "");
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!supabaseUrl || !supabaseKey) {
          console.error("Protected raw route is missing Supabase URL or publishable key.");
          return new Response("-- loader configuration error", { status: 500, headers });
        }

        try {
          const result = await fetch(`${supabaseUrl}/rest/v1/rpc/get_protected_raw_script`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ _slug: slug, _api_key: apiKey }),
            signal: AbortSignal.timeout(8000),
          });
          if (!result.ok) {
            console.error("Protected raw route Supabase request failed:", result.status);
            return new Response("-- loader temporarily unavailable", { status: 502, headers });
          }
          const source: unknown = await result.json();
          if (source === null || source === "") {
            return new Response("-- invalid API key or script not found", { status: 403, headers });
          }
          if (typeof source !== "string") {
            return new Response("-- loader temporarily unavailable", { status: 502, headers });
          }
          return new Response(source, { status: 200, headers });
        } catch (error) {
          console.error("Protected raw route request failed:", error);
          return new Response("-- loader temporarily unavailable", { status: 502, headers });
        }
      },
    },
  },
});
