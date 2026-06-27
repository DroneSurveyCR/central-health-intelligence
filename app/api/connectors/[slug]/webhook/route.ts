import { NextResponse } from "next/server";
import { getSyncProvider } from "@/lib/connectors/sync/registry";

export const dynamic = "force-dynamic";

// Webhook receiver for push-capable providers (Withings/Garmin/Oura). Per-provider
// HMAC verification + delta-enqueue is wired as each provider's webhook is enabled.
// Providers exposing webhookVerify() are authenticated (reject 401 on bad signature);
// providers without it keep the accept-stub behavior so they can't error-loop.
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const provider = getSyncProvider(slug);
  if (!provider) return NextResponse.json({ error: "unknown connector" }, { status: 404 });

  // Read the raw body once — HMAC verification needs the exact bytes the provider signed.
  const rawBody = await request.text();

  // If the provider can verify authenticity, it MUST pass before we enqueue anything.
  if (provider.webhookVerify) {
    let ok = false;
    try {
      ok = await provider.webhookVerify(request, rawBody);
    } catch {
      ok = false;
    }
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // TODO(per-provider): map external user -> token, enqueue delta job from rawBody.
  return NextResponse.json({ received: true, slug });
}

// Some providers verify a subscription with a GET challenge echo.
export async function GET(request: Request) {
  const challenge = new URL(request.url).searchParams.get("challenge");
  return challenge ? new NextResponse(challenge) : NextResponse.json({ ok: true });
}
