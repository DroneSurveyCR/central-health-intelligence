import { createClient } from "@/lib/supabase/server";
import {
  getCurrentPractitioner,
  getCurrentPatient,
} from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

/** Parse a numeric field that may be null/empty; returns null when absent. */
function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RawFood = {
  name?: unknown;
  qty?: unknown;
  unit?: unknown;
  kcal?: unknown;
  protein_g?: unknown;
  carb_g?: unknown;
  fat_g?: unknown;
};

type Food = {
  name: string;
  qty: number | null;
  unit: string | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
};

/** Normalize one incoming food row into a clean record, or null if invalid. */
function normalizeFood(raw: RawFood): Food | null {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  return {
    name,
    qty: parseOptionalNumber(raw.qty),
    unit:
      typeof raw.unit === "string" && raw.unit.trim() ? raw.unit.trim() : null,
    kcal: parseOptionalNumber(raw.kcal),
    protein_g: parseOptionalNumber(raw.protein_g),
    carb_g: parseOptionalNumber(raw.carb_g),
    fat_g: parseOptionalNumber(raw.fat_g),
  };
}

/** Sum a numeric field across foods; null when no food provides it. */
function sumField(foods: Food[], key: keyof Food): number | null {
  let total = 0;
  let seen = false;
  for (const f of foods) {
    const v = f[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v;
      seen = true;
    }
  }
  return seen ? total : null;
}

export async function POST(request: Request) {
  // Dual-auth: staff (provides patientId) OR patient (forced to own id).
  const practitioner = await getCurrentPractitioner();
  const patient = practitioner ? null : await getCurrentPatient();
  if (!practitioner && !patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const patientId = patient
    ? patient.id
    : String(body.patientId || "");
  if (!patientId)
    return NextResponse.json({ error: "missing patientId" }, { status: 400 });

  const rawFoods: RawFood[] = Array.isArray(body.foods) ? body.foods : [];
  const foods = rawFoods
    .map(normalizeFood)
    .filter((f): f is Food => f != null);

  if (foods.length === 0)
    return NextResponse.json(
      { error: "at least one food is required" },
      { status: 400 },
    );

  const loggedAt =
    typeof body.logged_at === "string" && body.logged_at
      ? body.logged_at
      : new Date().toISOString();
  const mealType =
    typeof body.meal_type === "string" && body.meal_type.trim()
      ? body.meal_type.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  // Use provided totals when present; otherwise compute by summing foods.
  const totalKcal =
    parseOptionalNumber(body.total_kcal) ?? sumField(foods, "kcal");
  const totalProtein =
    parseOptionalNumber(body.total_protein_g) ?? sumField(foods, "protein_g");
  const totalCarb =
    parseOptionalNumber(body.total_carb_g) ?? sumField(foods, "carb_g");
  const totalFat =
    parseOptionalNumber(body.total_fat_g) ?? sumField(foods, "fat_g");

  const supabase = await createClient();
  // RLS enforces staff can_access_patient, or patient self-write.
  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      patient_id: patientId,
      logged_at: loggedAt,
      meal_type: mealType,
      foods,
      total_kcal: totalKcal,
      total_protein_g: totalProtein,
      total_carb_g: totalCarb,
      total_fat_g: totalFat,
      notes,
      source: patient ? "patient" : "manual",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "food_logs",
    resourceId: data?.id ?? null,
    patientId,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
