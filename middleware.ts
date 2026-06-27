import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Keeps the Supabase session fresh on every navigation (so users aren't logged out
// at the access-token TTL) and bounces unauthenticated PAGE requests to /login.
// Route-level guards in the (staff)/(patient) layouts remain the authoritative gate.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|bodymap|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
