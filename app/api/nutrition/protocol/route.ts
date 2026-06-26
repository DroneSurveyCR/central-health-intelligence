import { createClient } from "@/lib/supabase/server";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

const VALID_DIET = [
  "carnivore",
  "keto",
  "low_carb",
  "mediterranean",
  "elimination",
  "custom",
];

/** Coerce an incoming value into a clean string[] (or null when empty). */
function toStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : null;
}

export async function POST(request: Request) {
  const p = await getCurrentPractitioner();
  if (!p) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = String(body.patientId || "");
  const protocolName = String(body.protocol_name || "").trim();

  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });
  if (!protocolName)
    return NextResponse.json(
      { error: "missing protocol_name" },
      { status: 400 },
    );

  const dietType =
    typeof body.diet_type === "string" && VALID_DIET.includes(body.diet_type)
      ? body.diet_type
      : null;
  const dailyTargets =
    body.daily_targets && typeof body.daily_targets === "object"
      ? body.daily_targets
      : null;
  const mealTiming =
    typeof body.meal_timing === "string" && body.meal_timing.trim()
      ? body.meal_timing.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  const startDate =
    typeof body.start_date === "string" && body.start_date
      ? body.start_date
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_protocols")
    .insert({
      patient_id: patientId,
      practitioner_id: p.id,
      protocol_name: protocolName,
      diet_type: dietType,
      daily_targets: dailyTargets,
      foods_to_avoid: toStringArray(body.foods_to_avoid),
      foods_to_emphasize: toStringArray(body.foods_to_emphasize),
      meal_timing: mealTiming,
      notes,
      start_date: startDate,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "nutrition_protocols",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
