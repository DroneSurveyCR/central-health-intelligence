import { NextResponse } from "next/server";
import { getSyncProvider } from "@/lib/connectors/sync/registry";

export const dynamic = "force-dynamic";

// Webhook receiver for push-capable providers (Withings/Garmin/Oura). Per-provider
// HMAC verification + delta-enqueue is wired as each provider's webhook is enabled;
// today this acknowledges and no-ops so a misconfigured provider can't error-loop.
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const provider = getSyncProvider(slug);
  if (!provider) return NextResponse.json({ error: "unknown connector" }, { status: 404 });
  // TODO(per-provider): verify signature, map external user -> token, enqueue delta job.
  return NextResponse.json({ received: true, slug });
}

// Some providers verify a subscription with a GET challenge echo.
export async function GET(request: Request) {
  const challenge = new URL(request.url).searchParams.get("challenge");
  return challenge ? new NextResponse(challenge) : NextResponse.json({ ok: true });
}
