import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { logAudit } from "@/lib/auth/audit";
import { isDoseSafe, maxDoseFor, doseUnitFor } from "@/lib/hrt/templates";
import { NextResponse } from "next/server";

const VALID_BY = ["clinic", "self", "home_nurse"];

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  await requireModule("hrt");
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const protocolId = String(body.protocol_id || "");
  const dose = Number(body.dose);

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!protocolId)
    return NextResponse.json({ error: "missing protocol_id" }, { status: 400 });
  if (body.dose == null || !Number.isFinite(dose))
    return NextResponse.json({ error: "invalid dose" }, { status: 400 });

  const supabase = await createClient();

  // [CLINICAL-REVIEW P1/P2] validate the administered dose against the
  // protocol's per-hormone ceiling (finite, positive, ≤ guard max) before
  // recording it. The guard map is conservative — a clinician must confirm it.
  const { data: proto } = await supabase
    .from("hrt_protocols")
    .select("hormone")
    .eq("id", protocolId)
    .maybeSingle();
  // Fail-safe: an unresolvable protocol (wrong/foreign id, RLS-denied) must NOT fall through to
  // the generic dose ceiling — reject so the dose is always checked against a real hormone.
  if (!proto)
    return NextResponse.json({ error: "protocol not found" }, { status: 404 });
  if (!isDoseSafe(dose, proto?.hormone))
    return NextResponse.json(
      { error: `dose must be > 0 and ≤ ${maxDoseFor(proto?.hormone)}` },
      { status: 400 },
    );

  const route =
    typeof body.route === "string" && body.route.trim()
      ? body.route.trim()
      : null;
  const doseUnit =
    typeof body.dose_unit === "string" && body.dose_unit.trim()
      ? body.dose_unit.trim()
      : doseUnitFor(proto?.hormone);
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
  // [CLINICAL-REVIEW P10] clamp out-of-range severity to 1-5 (null when absent).
  const sevRaw = parseOptionalNumber(body.side_effect_severity);
  const severity =
    sevRaw != null ? Math.min(5, Math.max(1, Math.round(sevRaw))) : null;
  const sideEffects = Array.isArray(body.side_effects)
    ? (body.side_effects as unknown[])
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0)
    : null;

  const { data, error } = await supabase
    .from("hrt_administrations")
    .insert({
      patient_id: patientId,
      protocol_id: protocolId,
      dose,
      dose_unit: doseUnit,
      route,
      injection_site: injectionSite,
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
    resource: "hrt_administrations",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
