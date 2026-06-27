import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnySupabaseClient } from "@/lib/connectors/types";
import { entitlementsForPlan, planForPrice, isPlanId, type PlanId } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

// Stripe webhook. Two responsibilities:
//   1. Patient pays their own invoice  -> mark invoice paid + ledger payment (unchanged).
//   2. Practice subscribes/changes plan -> set practices.plan + practices.modules.
// Must receive the RAW body for signature verification; runs admin (no user session).

async function applyPlan(
  admin: AnySupabaseClient,
  practiceId: string,
  plan: PlanId,
  ids: { customerId?: string | null; subscriptionId?: string | null },
) {
  const patch: Record<string, unknown> = { plan, modules: entitlementsForPlan(plan) };
  if (ids.customerId) patch.stripe_customer_id = ids.customerId;
  if (ids.subscriptionId !== undefined) patch.stripe_subscription_id = ids.subscriptionId;
  await admin.from("practices").update(patch).eq("id", practiceId);
}

async function handleInvoicePayment(admin: AnySupabaseClient, session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  if (!invoiceId || session.payment_status !== "paid") return;
  const { data: inv } = await admin
    .from("invoices")
    .select("id, number, total, patient_id, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || inv.status === "paid") return;
  await admin
    .from("invoices")
    .update({ status: "paid", payment_method: "stripe", paid_at: new Date().toISOString(), receipt_issued: true })
    .eq("id", invoiceId);
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

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // SaaS plan subscription
    if (session.mode === "subscription" && session.metadata?.practiceId && isPlanId(session.metadata?.plan)) {
      await applyPlan(admin, session.metadata.practiceId, session.metadata.plan, {
        customerId: typeof session.customer === "string" ? session.customer : null,
        subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      });
    } else {
      // Patient invoice payment (existing behavior)
      await handleInvoicePayment(admin, session);
    }
  } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const practiceId = sub.metadata?.practiceId;
    const plan: PlanId | null = isPlanId(sub.metadata?.plan)
      ? (sub.metadata.plan as PlanId)
      : planForPrice(sub.items.data[0]?.price?.id);
    if (practiceId && plan && (sub.status === "active" || sub.status === "trialing")) {
      await applyPlan(admin, practiceId, plan, {
        customerId: typeof sub.customer === "string" ? sub.customer : null,
        subscriptionId: sub.id,
      });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const practiceId = sub.metadata?.practiceId;
    // Retain-and-hide: downgrade to starter; existing rows preserved, modules gated.
    if (practiceId) await applyPlan(admin, practiceId, "starter", { subscriptionId: null });
  }

  return NextResponse.json({ received: true });
}
