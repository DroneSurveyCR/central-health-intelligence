import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Keeps the Supabase session fresh on every navigation (so users aren't logged out
// at the access-token TTL) and bounces unauthenticated PAGE requests to /login.
// Route-level guards in the (staff)/(patient) layouts remain the authoritative gate.
export async function middleware(request: NextRequest) {
  // -------------------------------------------------------------------------
  // Host-based tenant rewrite (SCAFFOLD).
  // If the request arrives on a *tenant* host (a real subdomain or custom domain)
  // — i.e. NOT the app's own vercel.app host and NOT localhost — and is hitting
  // the site root "/", rewrite it to that tenant's public clinic page `/p/<tenant>`.
  //
  // This is intentionally guarded so the canonical app domain (*.vercel.app) and
  // localhost keep their normal behavior (onboarding, login, dashboard, etc).
  //
  // NOTE: Real subdomains require external Vercel wildcard-domain config, and a
  // `practices.custom_domain` lookup should later map custom domains -> slug.
  // For now we treat the left-most subdomain label as the slug.
  // -------------------------------------------------------------------------
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;

  const isAppDomain =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".localhost");

  if (!isAppDomain && path === "/") {
    // tenant label: left-most subdomain label, else the bare host (custom domain).
    // TODO(custom_domain): replace with a practices.custom_domain -> slug lookup.
    const labels = host.split(".");
    const tenant = labels.length > 2 ? labels[0] : host;
    if (tenant) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${tenant}`;
      return NextResponse.rewrite(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|bodymap|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
