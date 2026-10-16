import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppSidebar } from "@/components/app/AppSidebar";
import { BrandMark } from "@/components/app/BrandMark";
import { DesktopTitleBar } from "@/components/app/DesktopTitleBar";
import { TimerBar } from "@/components/app/TimerBar";
import { Toaster } from "@/components/ui/sonner";
import { authQuery } from "@/lib/queries";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { title: "Hours — personal time tracking" },
      { name: "description", content: "A fast, private time tracker for weekly work hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/hours-mark.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RootContent />
    </QueryClientProvider>
  );
}

function RootContent() {
  const desktopMode = import.meta.env["VITE_DESKTOP_MODE"] === "true";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: auth, isPending } = useQuery({
    ...authQuery(),
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(["auth"], { authenticated: false });
      void navigate({ to: "/login" });
    };
    window.addEventListener("time-tracker:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("time-tracker:unauthorized", handleUnauthorized);
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!isPending && auth && !auth.authenticated && pathname !== "/login") {
      void navigate({ to: "/login" });
    }
  }, [auth, isPending, navigate, pathname]);

  if (pathname === "/login") {
    return (
      <>
        <Outlet />
        <Toaster position="bottom-right" />
      </>
    );
  }

  if (isPending || !auth?.authenticated) {
    return (
      <>
        <div className="flex h-screen items-center justify-center bg-background">
          <BrandMark className="size-9" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        {desktopMode && <DesktopTitleBar />}
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TimerBar />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
