import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DEMO_EMAIL = "demo@chi.health";
const RATE_MAP = new Map<string, number>();
const RATE_WINDOW = 60_000; // 1 min
const RATE_LIMIT = 20;

/** GET /api/demo — generates a one-time magic link for the demo practitioner and redirects. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();

  // Simple in-process rate limit — resets per worker restart (fine for demo)
  const bucket = `${ip}:${Math.floor(now / RATE_WINDOW)}`;
  const count = (RATE_MAP.get(bucket) ?? 0) + 1;
  RATE_MAP.set(bucket, count);
  if (count > RATE_LIMIT) {
    return new NextResponse("Too many demo requests — try again in a minute.", { status: 429 });
  }

  const origin = new URL(req.url).origin;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
    options: { redirectTo: `${origin}/auth/callback?next=/focus` },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[demo] generateLink error:", error);
    return NextResponse.redirect(`${origin}/login?error=demo_unavailable`);
  }

  return NextResponse.redirect(data.properties.action_link);
}
