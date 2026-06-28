import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const STATUSES = ["waiting", "offered", "booked", "removed"] as const;

/** POST — add a patient to the waitlist. Body: { patientId, notes?, priority? }. */
export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 5;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({ patient_id: patientId, notes, priority, status: "waiting" })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({ action: "create", resource: "waitlist_entries", resourceId: data?.id ?? null, patientId });
  return NextResponse.json({ ok: true, id: data?.id });
}

/** PATCH — change a waitlist entry's status. Body: { id, status }. */
export async function PATCH(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const practitioner = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number]))
    return NextResponse.json({ error: "missing id or invalid status" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_entries").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({ action: "update", resource: "waitlist_entries", resourceId: id });
  return NextResponse.json({ ok: true });
}
