import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on the Node.js runtime: the Supabase SSR client (@supabase/ssr) isn't
  // accepted by Vercel's Edge bundler for middleware. Node runtime avoids it.
  runtime: "nodejs",
  matcher: [
    // everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|bodymap|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
