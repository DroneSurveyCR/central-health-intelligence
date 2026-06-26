import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { getStripe, stripeEnabled } from "@/lib/stripe";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://healthsync-app-eight.vercel.app";
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
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
    success_url: `${appUrl}/billing/${inv.id}?paid=1`,
    cancel_url: `${appUrl}/billing/${inv.id}`,
  });

  return NextResponse.json({ url: session.url });
}
