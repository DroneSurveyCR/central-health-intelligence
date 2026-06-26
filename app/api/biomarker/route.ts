import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse an optional integer field; returns null when absent/invalid. */
function parseOptionalInt(v: unknown): number | null {
  const n = parseOptionalNumber(v);
  return n == null ? null : Math.trunc(n);
}

type RawMarker = {
  name?: unknown;
  value?: unknown;
  unit?: unknown;
  ref_low?: unknown;
  ref_high?: unknown;
  optimal_low?: unknown;
  optimal_high?: unknown;
};

/** Normalize one incoming marker row into a clean record, or null if invalid. */
function normalizeMarker(raw: RawMarker) {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const value = Number(raw?.value);
  if (!name) return null;
  if (raw?.value == null || raw.value === "" || !Number.isFinite(value))
    return null;
  return {
    name,
    value,
    unit:
      typeof raw.unit === "string" && raw.unit.trim() ? raw.unit.trim() : null,
    ref_low: parseOptionalNumber(raw.ref_low),
    ref_high: parseOptionalNumber(raw.ref_high),
    optimal_low: parseOptionalNumber(raw.optimal_low),
    optimal_high: parseOptionalNumber(raw.optimal_high),
  };
}

export async function POST(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const panelName = String(body.panel_name || "").trim();

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!panelName)
    return NextResponse.json({ error: "missing panel_name" }, { status: 400 });

  const drawnAt =
    typeof body.drawn_at === "string" && body.drawn_at
      ? body.drawn_at
      : new Date().toISOString().slice(0, 10);

  const labName =
    typeof body.lab_name === "string" && body.lab_name.trim()
      ? body.lab_name.trim()
      : null;
  const sourceType =
    typeof body.source_type === "string" && body.source_type.trim()
      ? body.source_type.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const rawMarkers: RawMarker[] = Array.isArray(body.markers)
    ? body.markers
    : [];
  const markers = rawMarkers
    .map(normalizeMarker)
    .filter((m): m is NonNullable<typeof m> => m != null);

  const supabase = await createClient();
  // RLS enforces that this practitioner can_access_patient for the insert.
  const { data, error } = await supabase
    .from("biomarker_panels")
    .insert({
      patient_id: patientId,
      panel_name: panelName,
      drawn_at: drawnAt,
      lab_name: labName,
      source_type: sourceType,
      markers,
      biological_age: parseOptionalNumber(body.biological_age),
      chronological_age: parseOptionalInt(body.chronological_age),
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "biomarker_panels",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(request: Request) {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id)
    return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = await createClient();
  // RLS scopes this delete to panels the practitioner can access.
  const { data, error } = await supabase
    .from("biomarker_panels")
    .delete()
    .eq("id", id)
    .select("id, patient_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "delete",
    resource: "biomarker_panels",
    resourceId: id,
    patientId: data?.patient_id ?? null,
  });

  return NextResponse.json({ ok: true });
}
