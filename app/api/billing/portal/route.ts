import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getCurrentPractice } from "@/lib/billing/practice";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Open the Stripe-hosted Customer Portal for the caller's own practice (admin/doctor
// only). Stripe handles upgrade/downgrade/cancel, payment methods, and invoice history.
// Returns 503 when Stripe is off or the practice has no Stripe customer yet (i.e. it has
// never started a subscription checkout, so there is nothing to manage).
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const allowed = await rateLimit(`portal:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!stripeEnabled)
    return NextResponse.json({ error: "Billing is not enabled yet." }, { status: 503 });

  const practice = await getCurrentPractice();
  if (!practice) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (practice.role !== "admin" && practice.role !== "doctor")
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  if (!practice.stripe_customer_id)
    return NextResponse.json(
      { error: "No billing account yet. Choose a plan first." },
      { status: 503 },
    );

  const origin = new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: practice.stripe_customer_id,
    return_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
