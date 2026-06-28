import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnySupabaseClient } from "@/lib/connectors/types";
import { entitlementsForPlan, planForPrice, isPlanId, type PlanId } from "@/lib/billing/plans";
import { captureError } from "@/lib/observability/logger";

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
  // Atomic transition: a duplicate/replayed webhook delivery races here. The .neq("status","paid")
  // guard means only the delivery that actually flips sent→paid proceeds to write the ledger row;
  // the loser matches 0 rows (the row lock serializes them) and returns without double-inserting.
  const { data: flipped } = await admin
    .from("invoices")
    .update({ status: "paid", payment_method: "stripe", paid_at: new Date().toISOString(), receipt_issued: true })
    .eq("id", invoiceId)
    .neq("status", "paid")
    .select("id");
  if (!flipped?.length) return;
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
  try {
    return await handlePost(request);
  } catch (err) {
    // Log + report without altering behavior: rethrow so the platform still 500s.
    await captureError(err, { route: "stripe/webhook" });
    throw err;
  }
}

async function handlePost(request: Request) {
  if (!stripeEnabled) return NextResponse.json({ error: "stripe disabled" }, { status: 503 });
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  // Platform events (subscriptions, setup fee) sign with STRIPE_WEBHOOK_SECRET; connected-account
  // events (patient invoice payments) sign with the Connect endpoint secret. Try both, but REMEMBER
  // which one verified — plan/module grants must NEVER be driven by a connected-account event, or a
  // clinic could grant itself the top plan for free from its own Stripe.
  const candidates = [
    { kind: "platform" as const, secret: process.env.STRIPE_WEBHOOK_SECRET },
    { kind: "connect" as const, secret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET },
  ].filter((c) => c.secret) as { kind: "platform" | "connect"; secret: string }[];
  if (!candidates.length) return NextResponse.json({ error: "no webhook secret" }, { status: 400 });

  const raw = await request.text();
  const stripe = getStripe();
  let event: Stripe.Event | null = null;
  let verifiedKind: "platform" | "connect" | null = null;
  for (const c of candidates) {
    try {
      event = stripe.webhooks.constructEvent(raw, sig, c.secret);
      verifiedKind = c.kind;
      break;
    } catch {
      /* try the next secret */
    }
  }
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  // A connected-account event carries `event.account`. Treat platform-trust as: verified by the
  // platform secret AND not originating from a connected account. Only platform-trusted events may
  // mutate plan/modules/setup-fee. Connected-account events may ONLY settle patient invoices.
  const platformTrusted = verifiedKind === "platform" && !(event as Stripe.Event).account;

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // One-time HIPAA setup fee (platform-trusted only)
    if (platformTrusted && session.metadata?.kind === "setup_fee" && session.metadata?.practiceId && session.payment_status === "paid") {
      const patch: Record<string, unknown> = { setup_fee_paid_at: new Date().toISOString() };
      if (typeof session.customer === "string") patch.stripe_customer_id = session.customer;
      await admin.from("practices").update(patch).eq("id", session.metadata.practiceId);
    }
    // SaaS plan subscription (platform-trusted only)
    else if (platformTrusted && session.mode === "subscription" && session.metadata?.practiceId && isPlanId(session.metadata?.plan)) {
      await applyPlan(admin, session.metadata.practiceId, session.metadata.plan, {
        customerId: typeof session.customer === "string" ? session.customer : null,
        subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      });
    } else {
      // Patient invoice payment — benign (marks an invoice paid by its own metadata invoiceId);
      // allowed from either account context.
      await handleInvoicePayment(admin, session);
    }
  } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    // Plan grants: platform-trusted only. Ignore connected-account subscription events outright.
    if (!platformTrusted) return NextResponse.json({ received: true });
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
    // Plan downgrade: platform-trusted only — a forged connected-account event must not strip modules.
    if (!platformTrusted) return NextResponse.json({ received: true });
    const sub = event.data.object as Stripe.Subscription;
    const practiceId = sub.metadata?.practiceId;
    // Retain-and-hide: downgrade to starter; existing rows preserved, modules gated.
    if (practiceId) await applyPlan(admin, practiceId, "starter", { subscriptionId: null });
  }

  return NextResponse.json({ received: true });
}
