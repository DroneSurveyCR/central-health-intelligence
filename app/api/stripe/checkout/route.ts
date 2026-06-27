import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { applicationFeeBps } from "@/lib/billing/connect";

export const dynamic = "force-dynamic";

// Patient pays one of their own invoices via Stripe Checkout (hosted, redirect-based).
export async function POST(request: Request) {
  if (!stripeEnabled) return NextResponse.json({ error: "Card payments are not enabled yet." }, { status: 503 });

  const patient = await getCurrentPatient();
  if (!patient) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { invoiceId?: string };
  const invoiceId = String(body.invoiceId ?? "").trim();
  if (!invoiceId) return NextResponse.json({ error: "missing invoiceId" }, { status: 400 });

  const supabase = await createClient();
  // RLS limits this to the patient's own invoices.
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, number, total, currency, status, patient_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "invoice not found" }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
  if (inv.status === "void") return NextResponse.json({ error: "This invoice was voided." }, { status: 400 });

  const amount = Math.round(Number(inv.total ?? 0) * 100);
  if (amount <= 0) return NextResponse.json({ error: "Nothing to pay on this invoice." }, { status: 400 });

  // Route the charge to the CLINIC's own connected Stripe account (per-tenant) — the
  // money belongs to the clinic, not the platform. Block if they haven't connected.
  const { data: pt } = await supabase.from("patients").select("practice_id").eq("id", inv.patient_id).maybeSingle();
  const admin = createAdminClient();
  const { data: pr } = await admin
    .from("practices")
    .select("stripe_connect_account_id")
    .eq("id", (pt?.practice_id as string | undefined) ?? "")
    .maybeSingle();
  const connectedAccount = (pr?.stripe_connect_account_id as string | null) ?? null;
  if (!connectedAccount)
    return NextResponse.json({ error: "This clinic hasn't connected card payments yet." }, { status: 503 });

  const appUrl = new URL(request.url).origin;
  const feeBps = applicationFeeBps();
  const fee = feeBps > 0 ? Math.round((amount * feeBps) / 10000) : 0;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: patient.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (inv.currency || "USD").toLowerCase(),
            unit_amount: amount,
            product_data: { name: `Invoice ${inv.number ?? ""}`.trim() },
          },
        },
      ],
      metadata: { invoiceId: inv.id, patientId: inv.patient_id, number: inv.number ?? "" },
      ...(fee > 0 ? { payment_intent_data: { application_fee_amount: fee } } : {}),
      success_url: `${appUrl}/billing/${inv.id}?paid=1`,
      cancel_url: `${appUrl}/billing/${inv.id}`,
    },
    { stripeAccount: connectedAccount },
  );

  return NextResponse.json({ url: session.url });
}
