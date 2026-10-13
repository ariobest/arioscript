import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

/**
 * Public raw URLs must never expose Lua source.
 * Source remains viewable from the authenticated Admin > Raw Loader page.
 * Executor/API delivery must use a separate server-side API-key protected endpoint.
 */
export const Route = createFileRoute("/raw/$slug")({
  server: {
    handlers: {
      GET: async () => new Response("", { status: 404, headers }),
    },
  },
});
