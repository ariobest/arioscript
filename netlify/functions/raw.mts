const responseHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

export default async function rawLoader(_request: Request, context: { params: Record<string, string | undefined> }) {
  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    return new Response("", { status: 404, headers: responseHeaders });
  }

  const supabaseUrl = (Netlify.env.get("SUPABASE_URL") || Netlify.env.get("VITE_SUPABASE_URL") || "").replace(/\/+$/, "");
  const supabaseKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";
  if (!supabaseUrl || !supabaseKey) {
    console.error("Raw loader is missing Supabase URL or publishable key.");
    return new Response("", { status: 500, headers: responseHeaders });
  }

  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/get_raw_script`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _slug: slug }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) {
      console.error("Raw loader Supabase request failed:", result.status);
      return new Response("", { status: 502, headers: responseHeaders });
    }
    const source: unknown = await result.json();
    if (source === null || source === "") return new Response("", { status: 404, headers: responseHeaders });
    if (typeof source !== "string") return new Response("", { status: 502, headers: responseHeaders });
    return new Response(source, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Raw loader request failed:", error);
    return new Response("", { status: 502, headers: responseHeaders });
  }
}

export const config = { path: "/raw/:slug", method: ["GET"] };
