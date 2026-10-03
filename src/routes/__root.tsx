import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { installUISounds, playSound } from "@/lib/sounds";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/site/Layout";
import { applyTheme, getTheme, applyMode, getMode, applyMotion, getMotion, applyAccent, getAccent, applyMobileStyle, getMobileStyle, applyBackdrop, getBackdrop, type ColorMode } from "@/lib/theme";
import { Welcome } from "@/components/site/Welcome";
import { RouteProgress } from "@/components/site/RouteProgress";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <h1 className="font-display text-6xl font-bold text-primary">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This script or page doesn't exist.</p>
        <Link to="/" className="btn btn-primary mt-6">Back home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <h1 className="font-display text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            Try again
          </button>
          <a href="/" className="btn btn-ghost">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ARIO SCRIPTS — Premium Script Database" },
      { name: "description", content: "A curated database of premium Lua scripts, hand-picked and verified by the ARIO SCRIPTS team." },
      { property: "og:title", content: "ARIO SCRIPTS — Premium Script Database" },
      { property: "og:description", content: "A curated database of premium Lua scripts, hand-picked and verified by the ARIO SCRIPTS team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="midnight">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [mode, setMode] = useState<ColorMode>("dark");

  useEffect(() => {
    applyTheme(getTheme(), false);
    applyMode(getMode(), false);
    applyMotion(getMotion());
    applyMobileStyle(getMobileStyle());
    applyBackdrop(getBackdrop());
    if (getAccent()) applyAccent(getAccent());
    setMode(getMode());
    const update = () => setMode(getMode());
    window.addEventListener("ario-appearance", update);
    return () => window.removeEventListener("ario-appearance", update);
  }, []);

  useEffect(() => {
    const cleanup = installUISounds();
    const observer = new MutationObserver((changes) => {
      if (changes.some(change => [...change.addedNodes].some(node => node instanceof Element && (node.matches('[data-sonner-toast]') || node.querySelector('[data-sonner-toast]'))))) playSound("notification");
    });
    const host = document.querySelector('[data-sonner-toaster]');
    if (host) observer.observe(host, { childList: true, subtree: true });
    return () => { cleanup(); observer.disconnect(); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteLayout>
          {/* Required: nested routes render here. */}
          <Outlet />
        </SiteLayout>
        <RouteProgress />
        <Welcome />
        <Toaster theme={mode} position="top-center" visibleToasts={3} closeButton richColors toastOptions={{ className: "ario-toast", duration: 4000 }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
