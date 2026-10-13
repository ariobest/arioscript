import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const API_LOADER_UPSTREAM = "https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api";
const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
};

function browserInfoPage() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIO Script Loader</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b16;color:#f4f7ff;font:16px system-ui,sans-serif}.card{max-width:480px;margin:24px;padding:28px;border:1px solid #23365f;border-radius:20px;background:linear-gradient(145deg,#101b35,#090e1c);box-shadow:0 20px 80px #0008}h1{margin:0 0 10px;color:#8bb6ff}p{line-height:1.65;color:#b8c4dc}.tag{font-size:12px;letter-spacing:.12em;color:#83aaff}</style></head><body><main class="card"><div class="tag">ARIO · SCRIPT DELIVERY</div><h1>ARIO Script Loader</h1><p>This is an executor loader endpoint, not a webpage for viewing source. Use the loadstring provided by the ARIO API Manager in a compatible Lua environment.</p><p>Source is delivered only to clients requesting the loader response. This page does not make distributed Lua code impossible to capture.</p></main></body></html>`, { status: 200, headers: htmlHeaders });
}

export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // The special website URL proxies token-protected API delivery. Other raw slugs remain closed.
        if (params.slug !== "api-loader") return new Response("", { status: 404, headers });
        const incoming = new URL(request.url);
        const id = incoming.searchParams.get("id") ?? "";
        const token = incoming.searchParams.get("token") ?? "";
        if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(token)) {
          return new Response("", { status: 404, headers });
        }

        // Only treat an actual top-level browser navigation as a page visit.
        // Some Lua HttpGet clients advertise text/html too, so Accept alone can break execution.
        // Browsers send Fetch Metadata for navigations; executor requests normally do not.
        const fetchMode = (request.headers.get("sec-fetch-mode") ?? "").toLowerCase();
        const fetchDest = (request.headers.get("sec-fetch-dest") ?? "").toLowerCase();
        const fetchUser = request.headers.get("sec-fetch-user") ?? "";
        const accept = (request.headers.get("accept") ?? "").toLowerCase();
        const isBrowserNavigation =
          (fetchMode === "navigate" && fetchDest === "document") ||
          (accept.includes("text/html") && fetchUser === "?1");
        if (isBrowserNavigation) {
          return browserInfoPage();
        }

        try {
          const upstream = new URL(API_LOADER_UPSTREAM);
          upstream.searchParams.set("id", id);
          upstream.searchParams.set("token", token);
          const response = await fetch(upstream, {
            method: "GET",
            headers: { "accept": "*/*" },
            signal: AbortSignal.timeout(12000),
          });
          const body = await response.text();
          if (!response.ok) {
            return new Response(body, {
              status: response.status,
              headers: { ...headers, "Cache-Control": "no-store" },
            });
          }
          return new Response(body, { status: 200, headers });
        } catch {
          return new Response("ARIO loader unavailable", { status: 503, headers });
        }
      },
    },
  },
});
