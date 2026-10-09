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

  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    return plain("-- script not found", 404);
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
    console.error("Raw loader is missing Supabase URL or publishable key.");
    return plain("-- raw loader configuration error", 500);
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
      console.error("Raw loader Supabase request failed:", result.status);
      return plain("-- raw loader temporarily unavailable", 502);
    }

    const source: unknown = await result.json();
    if (source === null || source === "") {
      return plain("-- script not found", 404);
    }
    if (typeof source !== "string") {
      console.error("Raw loader received an unexpected response type.");
      return plain("-- raw loader temporarily unavailable", 502);
    }

    return new Response(source, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Raw loader request failed:", error);
    return plain("-- raw loader temporarily unavailable", 502);
  }
}

export const config = {
  path: "/raw/:slug",
  method: "GET",
};
