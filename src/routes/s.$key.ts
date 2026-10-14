import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api";
const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
};
const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
};

function infoPage() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIO Script Delivery</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b16;color:#f4f7ff;font:16px system-ui,sans-serif}.card{max-width:480px;margin:24px;padding:28px;border:1px solid #23365f;border-radius:20px;background:linear-gradient(145deg,#101b35,#090e1c);box-shadow:0 20px 80px #0008}h1{margin:0 0 10px;color:#8bb6ff}p{line-height:1.65;color:#b8c4dc}.tag{font-size:12px;letter-spacing:.12em;color:#83aaff}</style></head><body><main class="card"><div class="tag">ARIO · SECURE DELIVERY</div><h1>ARIO Script Loader</h1><p>This is a loader endpoint for compatible Lua environments, not a source-viewing page.</p><p>New ARIO loadstrings use a single opaque path key, without token= query parameters. A recipient who can execute a script may still capture the source delivered to their client.</p></main></body></html>`, { status: 200, headers: htmlHeaders });
}

export const Route = createFileRoute("/s/$key")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // One path segment contains the script UUID and one-time secret: <uuid>.<64-char-key>.
        // The secret is hashed and validated by the existing Supabase Edge Function.
        const match = /^([a-f0-9-]{36})\.([a-f0-9]{64})$/i.exec(params.key ?? "");
        if (!match) return new Response("", { status: 404, headers });

        const fetchMode = (request.headers.get("sec-fetch-mode") ?? "").toLowerCase();
        const fetchDest = (request.headers.get("sec-fetch-dest") ?? "").toLowerCase();
        const fetchUser = request.headers.get("sec-fetch-user") ?? "";
        const accept = (request.headers.get("accept") ?? "").toLowerCase();
        const browserNavigation =
          (fetchMode === "navigate" && fetchDest === "document") ||
          (accept.includes("text/html") && fetchUser === "?1");
        if (browserNavigation) return infoPage();

        try {
          const upstream = new URL(UPSTREAM);
          upstream.searchParams.set("id", match[1]);
          upstream.searchParams.set("token", match[2]);
          const response = await fetch(upstream, {
            method: "GET",
            headers: { accept: "*/*" },
            signal: AbortSignal.timeout(12000),
          });
          const body = await response.text();
          return new Response(body, {
            status: response.status,
            headers: { ...headers, "Cache-Control": "no-store, no-cache, must-revalidate" },
          });
        } catch {
          return new Response("ARIO loader unavailable", { status: 503, headers });
        }
      },
    },
  },
});
