import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  redirect,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SocialDesktopBar, SocialRealtime, SocialTabBar, SocialTopBar, isSocialPath } from "@/components/social/SocialChrome";
import { observeDecartLauncher } from "@/lib/decart";
import { useWishlistSync } from "@/hooks/useWishlistSync";
import { captureReferral } from "@/lib/referral";
import { getAffiliateProgram } from "@/lib/affiliate.functions";
import { ProfileSetupGate } from "@/components/ProfileEditor";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="zk-display text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="zk-label inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-xs text-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(err);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(err, { boundary: "tanstack_root_error_component" });
  }, [err]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="zk-label inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-xs text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="zk-label inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-xs text-foreground"
          >
            Go home
          </a>
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
      { title: "ZANKYO — Gen Z Streetwear" },
      { name: "description", content: "ZANKYO streetwear: Y2K graphic tees, baggy denim and hoodies." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ZANKYO" },
      { name: "google-site-verification", content: "vpNNwJQwqkJxgu2OF7QcfxJSgWxamHaHcCMN2Cw0AMo" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..900;1,400..900&family=Inter+Tight:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [
      { src: "https://anywear.decart.ai/widget/latest/anywear.js?domain=zankyo.in", async: true },
    ],
  }),
  // admin.zankyo.in only serves the admin panel (it also stays reachable at /admin).
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined" || !window.location.hostname.startsWith("admin.")) return;
    if (location.pathname !== "/admin" && !location.pathname.startsWith("/admin/")) throw redirect({ to: "/admin" });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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

function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => observeDecartLauncher(), []);
  useEffect(() => { getAffiliateProgram().then((p) => captureReferral(p.cookieDays || 365)).catch(() => captureReferral()); }, []);
  useWishlistSync();

  const isReels = pathname === "/reels" || pathname.startsWith("/reels/") && pathname !== "/reels/studio";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <>
        <Outlet />
        <Toaster position="bottom-center" mobileOffset={16} />
      </>
    );
  }

  const social = isSocialPath(pathname);
  return (
    <div className={`flex min-h-screen flex-col bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] ${social ? "" : "lg:pb-0"}`}>
      {/* Inside Social the store menu only shows on laptops; phones get the Social top bar. */}
      <div className={social ? "sticky top-0 z-50 hidden lg:block" : "contents"}>
        <Navbar />
      </div>
      {social && !isReels && <SocialTopBar />}
      {social && !isReels && <SocialDesktopBar />}
      <main className="flex-1">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </main>
      {!social && <Footer />}
      {social ? <SocialTabBar /> : !pathname.startsWith("/checkout") && <BottomTabBar />}
      <SocialRealtime />
      <ProfileSetupGate />
      <Toaster position="bottom-center" mobileOffset={72} />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
