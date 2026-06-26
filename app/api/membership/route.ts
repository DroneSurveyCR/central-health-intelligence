import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { MEMBERSHIP_PLANS } from "@/lib/memberships/plans";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const tierKey = String(body.tier ?? "").trim();
  const plan = MEMBERSHIP_PLANS.find((p) => p.key === tierKey);
  if (!plan)
    return NextResponse.json({ error: "unknown tier" }, { status: 400 });

  const total = Math.round(plan.priceMonthly * 100) / 100;

  // No memberships table yet — record interest as an order marked
  // "membership_request". The tier details live in items_json (real columns:
  // patient_id, status, total, items_json, placed_at). RLS lets a patient
  // insert their own order.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      patient_id: patient.id,
      status: "membership_request",
      total,
      items_json: [
        {
          kind: "membership_request",
          tier: plan.key,
          name: plan.name,
          price_monthly: total,
        },
      ],
      placed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data?.id });
}
