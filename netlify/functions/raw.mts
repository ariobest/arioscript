const responseHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};
function plain(message: string, status: number) {
  return new Response(message, { status, headers: responseHeaders });
}
export default async function rawLoader(request: Request, context: { params: Record<string, string | undefined> }) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const fetchDest = request.headers.get("sec-fetch-dest") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const looksLikeBrowser = request.method === "GET" &&
    (request.mode === "navigate" ||
      (/(mozilla|chrome|safari|firefox|edg)/i.test(userAgent) &&
        (fetchDest === "document" || accept.includes("text/html"))));
  if (request.method === "GET" && looksLikeBrowser) return new Response("", { status: 200, headers: responseHeaders });
  if (request.method !== "POST") return plain("", 401);
  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return plain("", 404);

  // Keys are accepted only in the POST body, never in the URL.
  let apiKey = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "key" in body) {
      const value = (body as { key?: unknown }).key;
      if (typeof value === "string") apiKey = value.trim();
    }
  } catch {
    return plain("", 400);
  }
  if (!apiKey) return plain("", 401);
  const supabaseUrl = (Netlify.env.get("SUPABASE_URL") || Netlify.env.get("VITE_SUPABASE_URL") || "").replace(/[/]+$/, "");
  const supabaseKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";
  if (!supabaseUrl || !supabaseKey) {
    console.error("Protected raw loader is missing Supabase URL or publishable key.");
    return plain("", 500);
  }
  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/get_protected_raw_script`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _slug: slug, _api_key: apiKey }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) {
      console.error("Protected raw loader Supabase request failed:", result.status);
      return plain("", 502);
    }
    const source: unknown = await result.json();
    if (source === null || source === "") return plain("", 403);
    if (typeof source !== "string") return plain("", 502);
    return new Response(source, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Protected raw loader request failed:", error);
    return plain("", 502);
  }
}
export const config = { path: "/raw/:slug", method: ["GET", "POST"] };
