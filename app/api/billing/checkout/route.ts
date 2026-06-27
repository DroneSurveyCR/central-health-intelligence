import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getCurrentPractice } from "@/lib/billing/practice";
import { PLANS, isPlanId } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

// Start a plan-subscription checkout for the caller's own practice (admin/doctor only).
// On payment the webhook flips practices.plan + practices.modules (entitlements).
export async function POST(request: Request) {
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

  const origin = new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: practice.stripe_customer_id ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { practiceId: practice.id, plan },
    subscription_data: { metadata: { practiceId: practice.id, plan } },
    success_url: `${origin}/settings/billing?upgraded=${plan}`,
    cancel_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
