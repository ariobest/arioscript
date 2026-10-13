const responseHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

/**
 * Public raw URLs are intentionally disabled so they cannot expose Lua source.
 * Admins can still view/edit source in the authenticated Admin > Raw Loader UI.
 * Do not restore public source delivery here; use an API-key protected endpoint.
 */
export default async function rawLoader(_request: Request, _context: { params: Record<string, string | undefined> }) {
  return new Response("", { status: 404, headers: responseHeaders });
}

export const config = { path: "/raw/:slug", method: ["GET"] };
