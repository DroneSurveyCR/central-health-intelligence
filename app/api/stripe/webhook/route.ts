import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Stripe webhook — on a completed Checkout, mark the invoice paid + write the ledger payment.
// Must receive the RAW body for signature verification, and runs with no user session (admin client).
export async function POST(request: Request) {
  if (!stripeEnabled) return NextResponse.json({ error: "stripe disabled" }, { status: 503 });
  const sig = request.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whsec) return NextResponse.json({ error: "missing signature/secret" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, whsec);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId && session.payment_status === "paid") {
      const admin = createAdminClient();
      const { data: inv } = await admin
        .from("invoices")
        .select("id, number, total, patient_id, status")
        .eq("id", invoiceId)
        .maybeSingle();
      if (inv && inv.status !== "paid") {
        await admin
          .from("invoices")
          .update({ status: "paid", payment_method: "stripe", paid_at: new Date().toISOString(), receipt_issued: true })
          .eq("id", invoiceId);
        // Mirror into the payments ledger (idempotent by invoice number/id) so revenue counts it.
        const ref = (inv.number as string | null) || `INV:${inv.id}`;
        const { data: dup } = await admin
          .from("payments")
          .select("id")
          .eq("patient_id", inv.patient_id)
          .eq("receipt_ref", ref)
          .maybeSingle();
        if (!dup) {
          await admin.from("payments").insert({
            patient_id: inv.patient_id,
            amount: inv.total,
            method: "stripe",
            receipt_ref: ref,
            signed_receipt: true,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
