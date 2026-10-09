const responseHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

function plain(message: string, status: number) {
  return new Response(message, { status, headers: responseHeaders });
}

export default async function rawLoader(
  request: Request,
  context: { params: Record<string, string | undefined> },
) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...responseHeaders, Allow: "GET" },
    });
  }

  const url = new URL(request.url);
  const apiKey = (url.searchParams.get("key") ?? "").trim();

  // Browser checks are only a casual deterrent. API-key validation below is the actual gate.
  const userAgent = request.headers.get("user-agent") ?? "";
  const fetchDest = request.headers.get("sec-fetch-dest") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const looksLikeBrowser =
    request.mode === "navigate" ||
    (/(mozilla|chrome|safari|firefox|edg)/i.test(userAgent) &&
      (fetchDest === "document" || accept.includes("text/html")));
  if (looksLikeBrowser) return new Response("", { status: 200, headers: responseHeaders });

  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    return plain("-- script not found", 404);
  }
  if (!apiKey) {
    return plain("-- valid ARIO API key required", 401);
  }

  const supabaseUrl = (
    Netlify.env.get("SUPABASE_URL") ||
    Netlify.env.get("VITE_SUPABASE_URL") ||
    ""
  ).replace(/\/+$/, "");
  const supabaseKey =
    Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    console.error("Protected raw loader is missing Supabase URL or publishable key.");
    return plain("-- loader configuration error", 500);
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
      console.error("Protected raw loader Supabase request failed:", result.status);
      return plain("-- loader temporarily unavailable", 502);
    }

    const source: unknown = await result.json();
    if (source === null || source === "") {
      return plain("-- invalid API key or script not found", 403);
    }
    if (typeof source !== "string") {
      console.error("Protected raw loader received an unexpected response type.");
      return plain("-- loader temporarily unavailable", 502);
    }

    return new Response(source, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Protected raw loader request failed:", error);
    return plain("-- loader temporarily unavailable", 502);
  }
}

export const config = {
  path: "/raw/:slug",
  method: "GET",
};
