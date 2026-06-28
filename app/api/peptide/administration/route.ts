import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { isDoseSafe, maxDoseFor } from "@/lib/peptide/templates";
import { NextResponse } from "next/server";

const VALID_BY = ["clinic", "self", "home_nurse"];

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const p = gate.practitioner;

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const protocolId = String(body.protocol_id || "");
  const doseMg = Number(body.dose_mg);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!protocolId)
    return NextResponse.json({ error: "missing protocol_id" }, { status: 400 });
  if (body.dose_mg == null || !Number.isFinite(doseMg))
    return NextResponse.json({ error: "invalid dose_mg" }, { status: 400 });

  const supabase = await createClient();

  // [CLINICAL-REVIEW P1/P2] validate the administered dose against the protocol's
  // compound ceiling (positive, ≤ labeled max) before recording it.
  const { data: proto } = await supabase
    .from("peptide_protocols")
    .select("compound")
    .eq("id", protocolId)
    .maybeSingle();
  // Fail-safe: a protocol that can't be resolved (wrong/foreign id, RLS-denied) must NOT fall
  // through to the generic 100 mg ceiling — reject so the dose is always checked against a real compound.
  if (!proto)
    return NextResponse.json({ error: "protocol not found" }, { status: 404 });
  if (!isDoseSafe(doseMg, proto?.compound))
    return NextResponse.json(
      { error: `dose_mg must be > 0 and ≤ ${maxDoseFor(proto?.compound)} mg` },
      { status: 400 },
    );

  const route =
    typeof body.route === "string" && body.route.trim()
      ? body.route.trim()
      : null;
  const injectionSite =
    typeof body.injection_site === "string" && body.injection_site.trim()
      ? body.injection_site.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  const administeredBy =
    typeof body.administered_by === "string" &&
    VALID_BY.includes(body.administered_by)
      ? body.administered_by
      : null;
  // [CLINICAL-REVIEW P9/P10] reject implausible weight / out-of-range severity.
  const weightRaw = parseOptionalNumber(body.weight_kg);
  const weightKg = weightRaw != null && weightRaw > 0 && weightRaw < 500 ? weightRaw : null;
  const sevRaw = parseOptionalNumber(body.side_effect_severity);
  const severity = sevRaw != null && sevRaw >= 1 && sevRaw <= 5 ? Math.round(sevRaw) : null;
  const sideEffects = Array.isArray(body.side_effects)
    ? (body.side_effects as unknown[])
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0)
    : null;

  const { data, error } = await supabase
    .from("peptide_administrations")
    .insert({
      patient_id: patientId,
      protocol_id: protocolId,
      dose_mg: doseMg,
      route,
      injection_site: injectionSite,
      weight_kg: weightKg,
      side_effects: sideEffects,
      side_effect_severity: severity,
      notes,
      administered_by: administeredBy,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "peptide_administrations",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
