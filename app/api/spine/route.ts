import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

// Save a chiropractic spine assessment. One row per visit in spine_assessments.
// practice_id is set by the column default (current_practice_id()); RLS confines
// the write to the caller's tenant. Same guard shape as the other vertical routes.

const VALID_STATUS = ["draft", "final"];

const asArray = (v: unknown, cap: number): unknown[] => (Array.isArray(v) ? v.slice(0, cap) : []);
const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export async function POST(request: Request) {
  await requireModule("chiro");
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const p = gate.practitioner;

  const body = await request.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  if (!patientId) return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const status =
    typeof body.status === "string" && VALID_STATUS.includes(body.status) ? body.status : "draft";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spine_assessments")
    .insert({
      patient_id: patientId,
      practitioner_id: p.id,
      vertebrae: asArray(body.vertebrae, 40),
      conditions: asObject(body.conditions),
      regions: asArray(body.regions, 20),
      voice_notes: asArray(body.voice_notes, 200),
      status,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ action: "create", resource: "spine_assessments", resourceId: data?.id ?? null, patientId });
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(request: Request) {
  await requireModule("chiro");
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.vertebrae !== undefined) patch.vertebrae = asArray(body.vertebrae, 40);
  if (body.regions !== undefined) patch.regions = asArray(body.regions, 20);
  if (body.voice_notes !== undefined) patch.voice_notes = asArray(body.voice_notes, 200);
  if (body.conditions !== undefined) patch.conditions = asObject(body.conditions);
  if (typeof body.status === "string" && VALID_STATUS.includes(body.status)) patch.status = body.status;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spine_assessments")
    .update(patch)
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ action: "update", resource: "spine_assessments", resourceId: id, patientId: data?.patient_id ?? null });
  return NextResponse.json({ ok: true, id: data?.id });
}
