import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-safe middleware: a cheap auth-cookie presence check that bounces
 * obviously-unauthenticated users off app routes. We deliberately do NOT import
 * the Supabase SSR client here — Vercel's Edge bundler rejects it. The real auth
 * enforcement (and the Supabase server client) live in the (staff)/(patient)
 * layouts, which do the actual getUser() check.
 *
 * NOTE (backlog): proactive token refresh normally happens in middleware with
 * @supabase/ssr. Here it's deferred to the server layer; long sessions may
 * require re-login after the access token's TTL. Revisit with a proper
 * edge-safe refresh (direct token endpoint) before heavy production use.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/api/onboarding") ||
    path.startsWith("/auth") ||
    path.startsWith("/legal") ||
    path.startsWith("/api/ical") ||
    path.startsWith("/api/reminders") ||
    path.startsWith("/api/stripe/webhook");

  if (isPublic) return NextResponse.next();

  // Supabase stores the session in cookies named `sb-<ref>-auth-token` (chunked
  // as `.0`, `.1`, …). Presence is a sufficient gate; layouts verify for real.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|bodymap|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
