import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getCurrentPractice } from "@/lib/billing/practice";

export const dynamic = "force-dynamic";

// One-time HIPAA setup fee — a single Checkout in `payment` mode (NOT a subscription).
// Uses STRIPE_PRICE_SETUP if a one-time Price is configured; otherwise an inline
// price_data charge for STRIPE_SETUP_FEE_CENTS (default 300000 = $3000). On payment the
// webhook stamps practices.setup_fee_paid_at via the metadata.kind === "setup_fee" branch.
export async function POST(request: Request) {
  if (!stripeEnabled)
    return NextResponse.json({ error: "Billing is not enabled yet." }, { status: 503 });

  const practice = await getCurrentPractice();
  if (!practice) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practice.role !== "admin" && practice.role !== "doctor")
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  if (practice.setup_fee_paid_at)
    return NextResponse.json({ error: "Setup fee already paid." }, { status: 400 });

  const configuredPrice = process.env.STRIPE_PRICE_SETUP;
  const feeCents = Number(process.env.STRIPE_SETUP_FEE_CENTS ?? "300000") || 300000;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPrice
    ? { price: configuredPrice, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: feeCents,
          product_data: { name: "HIPAA setup & onboarding (one-time)" },
        },
      };

  const origin = new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: practice.stripe_customer_id ?? undefined,
    line_items: [lineItem],
    metadata: { practiceId: practice.id, kind: "setup_fee" },
    payment_intent_data: { metadata: { practiceId: practice.id, kind: "setup_fee" } },
    // Stripe Tax: collects the billing address and computes tax automatically.
    // NOTE: Stripe Tax must be enabled in the Stripe Dashboard (Settings → Tax) for live.
    automatic_tax: { enabled: true },
    success_url: `${origin}/settings/billing?setup=paid`,
    cancel_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
