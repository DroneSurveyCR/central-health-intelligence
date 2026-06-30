import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and keeps cookies in sync.
 * Route-level access control lives in the (staff)/(patient) layouts; this only
 * keeps the session alive and bounces fully-unauthenticated users off app routes.
 */
export async function updateSession(
  request: NextRequest,
  forward?: Record<string, string>,
) {
  // Build a NextResponse.next that forwards extra request headers (e.g. x-request-id)
  // to route handlers. Called at init and inside setAll so cookies + headers coexist.
  const makeNext = () => {
    if (!forward) return NextResponse.next({ request });
    const h = new Headers(request.headers);
    Object.entries(forward).forEach(([k, v]) => h.set(k, v));
    return NextResponse.next({ request: { headers: h } });
  };

  let response = makeNext();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = makeNext();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // API routes self-authenticate and must return JSON errors (or run with their own
  // secret/signed-state auth: cron, OAuth callbacks, webhooks) — never redirect them
  // to an HTML login. The middleware only bounces unauthenticated PAGE navigations.
  // Public marketing site (the (site) route group) + auth/legal/public-clinic pages.
  const MARKETING = ["/product", "/solutions", "/trust", "/pricing", "/company", "/contact", "/demo"];
  const isPublic =
    path === "/" ||
    path.startsWith("/api/") ||
    path.startsWith("/login") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/p/") ||
    path.startsWith("/auth") ||
    path.startsWith("/legal") ||
    MARKETING.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
