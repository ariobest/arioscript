import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

async function serveProtectedRaw(request: Request, slugValue: string, allowBrowserBlank: boolean) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const fetchDest = request.headers.get("sec-fetch-dest") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const looksLikeBrowser = request.method === "GET" &&
    (request.mode === "navigate" ||
      (/(mozilla|chrome|safari|firefox|edg)/i.test(userAgent) &&
        (fetchDest === "document" || accept.includes("text/html"))));
  if (allowBrowserBlank && looksLikeBrowser) return new Response("", { status: 200, headers });
  const slug = String(slugValue ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return new Response("", { status: 404, headers });
  if (request.method !== "POST") return new Response("", { status: 401, headers });

  // Keys are accepted only in the POST body, never in the URL.
  let apiKey = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "key" in body) {
      const value = (body as { key?: unknown }).key;
      if (typeof value === "string") apiKey = value.trim();
    }
  } catch {
    return new Response("", { status: 400, headers });
  }
  if (!apiKey) return new Response("", { status: 401, headers });

  const supabaseUrl = (process.env["SUPABASE_URL"] ?? "").replace(/[/]+$/, "");
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!supabaseUrl || !supabaseKey) {
    console.error("Protected raw route is missing Supabase URL or publishable key.");
    return new Response("", { status: 500, headers });
  }
  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/get_protected_raw_script`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _slug: slug, _api_key: apiKey }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) {
      console.error("Protected raw route Supabase request failed:", result.status);
      return new Response("", { status: 502, headers });
    }
    const source: unknown = await result.json();
    if (source === null || source === "") return new Response("", { status: 403, headers });
    if (typeof source !== "string") return new Response("", { status: 502, headers });
    return new Response(source, { status: 200, headers });
  } catch (error) {
    console.error("Protected raw route request failed:", error);
    return new Response("", { status: 502, headers });
  }
}

export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => serveProtectedRaw(request, params.slug, true),
      POST: async ({ params, request }) => serveProtectedRaw(request, params.slug, false),
    },
  },
});
