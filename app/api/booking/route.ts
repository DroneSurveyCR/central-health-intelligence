import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPatient } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { computeTotals, lineTotal, servicePrice } from "@/lib/invoices/helpers";
import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Abuse guard: cap bookings per patient.
  if (!(await rateLimit(`booking:${patient.id}`, 12, 3600)))
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again later." },
      { status: 429 },
    );

  const body = await request.json();
  const start_time = String(body.start_time || "");
  if (!start_time)
    return NextResponse.json({ error: "missing start_time" }, { status: 400 });

  // Must be a valid, future time.
  const startMs = new Date(start_time).getTime();
  if (Number.isNaN(startMs))
    return NextResponse.json({ error: "invalid start_time" }, { status: 400 });
  if (startMs <= Date.now())
    return NextResponse.json(
      { error: "Please choose a future time." },
      { status: 400 },
    );

  const modality = body.modality === "online" ? "online" : "in_person";
  const type = ["consult", "follow_up", "scan_review", "other"].includes(body.type)
    ? body.type
    : "consult";
  const requestedLocationId = modality === "in_person" ? body.location_id || null : null;
  const notes = body.notes ? String(body.notes).slice(0, 200) : null;

  // Assign to a doctor IN THE PATIENT'S PRACTICE. The admin client bypasses RLS, so every
  // lookup below must be scoped by practice_id or a multi-tenant booking would pull a foreign
  // practice's doctor / availability / service pricing. (Patients can't read practitioners via RLS.)
  const practiceId = patient.practice_id as string;
  const admin = createAdminClient();
  const { data: doctor } = await admin
    .from("practitioners")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("role", "doctor")
    .eq("active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  // Validate a client-supplied location belongs to this practice; otherwise drop it
  // rather than store a dangling/cross-tenant reference on the appointment.
  let location_id: string | null = null;
  if (requestedLocationId) {
    const { data: loc } = await admin
      .from("locations")
      .select("id")
      .eq("id", requestedLocationId)
      .eq("practice_id", practiceId)
      .maybeSingle();
    location_id = loc?.id ?? null;
  }

  // Prevent double-booking: reject if this practitioner already has a
  // non-cancelled appointment at the exact same start time.
  if (doctor?.id) {
    const { data: clash } = await admin
      .from("appointments")
      .select("id")
      .eq("practice_id", practiceId)
      .eq("practitioner_id", doctor.id)
      .eq("start_time", start_time)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();
    if (clash)
      return NextResponse.json(
        { error: "That time was just taken — please pick another." },
        { status: 409 },
      );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patient.id,
      practitioner_id: doctor?.id ?? null,
      location_id,
      type,
      modality,
      start_time,
      status: "scheduled",
      booking_channel: "portal",
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "appointments",
    resourceId: data?.id ?? null,
    patientId: patient.id,
  });

  // Auto-create a DRAFT invoice with the booked service so the patient sees the cost and the
  // doctor only adds extras after the assessment. Best-effort — it never blocks the booking.
  let invoiceId: string | null = null;
  const serviceId = body.serviceId ? String(body.serviceId) : "";
  if (serviceId && data?.id) {
    try {
      const { data: svc } = await admin
        .from("services")
        .select("id, name, price, first_visit_price, taxable")
        .eq("id", serviceId)
        .eq("practice_id", practiceId)
        .maybeSingle();
      if (svc) {
        const { data: settings } = await admin
          .from("practice_settings")
          .select("tax_rate, currency")
          .eq("practice_id", practiceId)
          .maybeSingle();
        const taxRatePct = Number(settings?.tax_rate ?? 0) || 0;
        const currency = String(settings?.currency ?? "USD") || "USD";
        // First visit = the patient has no appointments other than the one just booked.
        const { count: apptCount } = await admin
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id);
        const isFirstVisit = (apptCount ?? 1) <= 1;
        const unit_price = servicePrice(
          { price: svc.price, first_visit_price: svc.first_visit_price },
          isFirstVisit,
        );
        const taxable = Boolean(svc.taxable);
        const totals = computeTotals([{ qty: 1, unit_price, taxable }], taxRatePct, 0);
        const { count: invCount } = await admin
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id);
        const number = `INV-${1000 + (invCount ?? 0) + 1}`;
        const { data: inv } = await admin
          .from("invoices")
          .insert({
            patient_id: patient.id,
            practitioner_id: doctor?.id ?? null,
            appointment_id: data.id,
            number,
            status: "draft",
            subtotal: totals.subtotal,
            discount: 0,
            tax_rate: taxRatePct,
            tax_amount: totals.taxAmount,
            total: totals.total,
            currency,
          })
          .select("id")
          .maybeSingle();
        if (inv) {
          await admin.from("invoice_items").insert({
            invoice_id: inv.id,
            kind: "service",
            ref_id: svc.id,
            description: svc.name,
            qty: 1,
            unit_price,
            line_total: lineTotal(1, unit_price),
            taxable,
            sort_order: 0,
          });
          invoiceId = inv.id;
        }
      }
    } catch {
      // booking already succeeded — a missing draft invoice is non-fatal
    }
  }

  return NextResponse.json({ ok: true, id: data?.id, invoiceId });
}
