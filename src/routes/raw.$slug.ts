import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

async function serveRaw(slugValue: string) {
  const slug = String(slugValue ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    return new Response("", { status: 404, headers });
  }

  const supabaseUrl = (process.env["SUPABASE_URL"] ?? "").replace(/\/+$/, "");
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!supabaseUrl || !supabaseKey) {
    console.error("Raw route is missing Supabase URL or publishable key.");
    return new Response("", { status: 500, headers });
  }

  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/get_raw_script`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ _slug: slug }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) {
      console.error("Raw route Supabase request failed:", result.status);
      return new Response("", { status: 502, headers });
    }
    const source: unknown = await result.json();
    if (source === null || source === "") return new Response("", { status: 404, headers });
    if (typeof source !== "string") return new Response("", { status: 502, headers });
    return new Response(source, { status: 200, headers });
  } catch (error) {
    console.error("Raw route request failed:", error);
    return new Response("", { status: 502, headers });
  }
}

export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => serveRaw(params.slug),
    },
  },
});
