import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getCurrentPractice, countProviderSeats } from "@/lib/billing/practice";
import { PLANS, isPlanId } from "@/lib/billing/plans";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Start a plan-subscription checkout for the caller's own practice (admin/doctor only).
// On payment the webhook flips practices.plan + practices.modules (entitlements).
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const allowed = await rateLimit(`billing:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!stripeEnabled)
    return NextResponse.json({ error: "Billing is not enabled yet." }, { status: 503 });

  const practice = await getCurrentPractice();
  if (!practice) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practice.role !== "admin" && practice.role !== "doctor")
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = String(body.plan ?? "");
  if (!isPlanId(plan)) return NextResponse.json({ error: "invalid plan" }, { status: 400 });

  const priceId = process.env[PLANS[plan].priceEnvVar];
  if (!priceId)
    return NextResponse.json(
      { error: `The ${PLANS[plan].label} plan price is not configured yet.` },
      { status: 503 },
    );

  // Per-provider seats: one quantity per active practitioner (min 1). The plan price
  // stays a single recurring price; total = price * seats.
  const seats = await countProviderSeats(practice.id);

  const origin = new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: practice.stripe_customer_id ?? undefined,
    line_items: [{ price: priceId, quantity: seats }],
    metadata: { practiceId: practice.id, plan, seats: String(seats) },
    subscription_data: { metadata: { practiceId: practice.id, plan } },
    // Stripe Tax: Stripe collects the billing address and computes tax automatically.
    // NOTE: Stripe Tax must be enabled in the Stripe Dashboard (Settings → Tax) for live.
    automatic_tax: { enabled: true },
    success_url: `${origin}/settings/billing?upgraded=${plan}`,
    cancel_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
