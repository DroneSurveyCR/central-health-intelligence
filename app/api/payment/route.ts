import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_METHODS = ["cash", "bitcoin", "zelle", "stripe"];

export async function POST(request: Request) {
  // Staff only — patients cannot record payments.
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "").trim();
  const amount = Number(body.amount);
  const method = String(body.method || "");
  const receiptRef =
    body.receiptRef != null && String(body.receiptRef).trim() !== ""
      ? String(body.receiptRef).trim()
      : null;
  const appointmentId =
    body.appointmentId != null && String(body.appointmentId).trim() !== ""
      ? String(body.appointmentId).trim()
      : null;

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json(
      { error: "amount must be greater than 0" },
      { status: 400 },
    );
  if (!VALID_METHODS.includes(method))
    return NextResponse.json({ error: "invalid method" }, { status: 400 });

  // Round to cents to keep numeric clean.
  const cleanAmount = Math.round(amount * 100) / 100;

  // NOTE: If method === "stripe" and a Stripe key is configured, a future
  // version could create a Stripe Checkout session here. No key in dev, so we
  // simply record the payment row.
  if (process.env.STRIPE_SECRET_KEY && method === "stripe") {
    // TODO: create Stripe Checkout session and store its reference.
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      patient_id: patientId,
      amount: cleanAmount,
      method,
      receipt_ref: receiptRef,
      appointment_id: appointmentId,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "payments",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
