// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const FALLBACK_ENV = {
  VITE_SUPABASE_URL: "https://c--e0c70c83-40aa-45ef-90c0-c486a1866eb9-prod.lovable.cloud",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e9XpA8qUHN2CD6bh5McaUA_e4iMkNGd",
  VITE_SUPABASE_PROJECT_ID: "rjfueocycybidbcpfmhv",
  SUPABASE_URL: "https://c--e0c70c83-40aa-45ef-90c0-c486a1866eb9-prod.lovable.cloud",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e9XpA8qUHN2CD6bh5McaUA_e4iMkNGd",
  SUPABASE_PROJECT_ID: "rjfueocycybidbcpfmhv",
};

for (const [key, val] of Object.entries(FALLBACK_ENV)) {
  if (!process.env[key]) {
    process.env[key] = val;
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || FALLBACK_ENV.VITE_SUPABASE_URL
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_ENV.VITE_SUPABASE_PUBLISHABLE_KEY
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env.VITE_SUPABASE_PROJECT_ID || FALLBACK_ENV.VITE_SUPABASE_PROJECT_ID
      ),
    },
  },
});
