import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import ProtocolForm from "./ProtocolForm";

type Food = {
  name?: string;
  qty?: number | null;
  unit?: string | null;
  kcal?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
};

type FoodLog = {
  id: string;
  logged_at: string;
  meal_type: string | null;
  foods: Food[] | null;
  total_kcal: number | null;
  total_protein_g: number | null;
  total_carb_g: number | null;
  total_fat_g: number | null;
  notes: string | null;
};

type SupplementLog = {
  id: string;
  logged_at: string;
  supplement_name: string;
  dose: string | null;
  timing: string | null;
  brand: string | null;
  notes: string | null;
};

type Protocol = {
  id: string;
  protocol_name: string;
  diet_type: string | null;
  daily_targets: Record<string, number> | null;
  foods_to_avoid: string[] | null;
  foods_to_emphasize: string[] | null;
  meal_timing: string | null;
  notes: string | null;
  start_date: string | null;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** Average a numeric column across logs, ignoring nulls. */
function avg(logs: FoodLog[], key: keyof FoodLog): number | null {
  const vals = logs
    .map((l) => l[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default async function StaffNutritionPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  await requireModule("nutrition");
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Patient not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "food_logs", patientId });

  const [{ data: foodData }, { data: suppData }, { data: protoData }] =
    await Promise.all([
      supabase
        .from("food_logs")
        .select(
          "id, logged_at, meal_type, foods, total_kcal, total_protein_g, total_carb_g, total_fat_g, notes",
        )
        .eq("patient_id", patientId)
        .order("logged_at", { ascending: false })
        .limit(30),
      supabase
        .from("supplement_logs")
        .select("id, logged_at, supplement_name, dose, timing, brand, notes")
        .eq("patient_id", patientId)
        .order("logged_at", { ascending: false })
        .limit(30),
      supabase
        .from("nutrition_protocols")
        .select(
          "id, protocol_name, diet_type, daily_targets, foods_to_avoid, foods_to_emphasize, meal_timing, notes, start_date",
        )
        .eq("patient_id", patientId)
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

  const foodLogs = (foodData ?? []) as FoodLog[];
  const supplementLogs = (suppData ?? []) as SupplementLog[];
  const protocols = (protoData ?? []) as Protocol[];

  const avgKcal = avg(foodLogs, "total_kcal");
  const avgProtein = avg(foodLogs, "total_protein_g");
  const avgCarb = avg(foodLogs, "total_carb_g");
  const avgFat = avg(foodLogs, "total_fat_g");

  return (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Back to record
        </Link>
      </div>
      <p className="muted">Nutrition &amp; food intake</p>

      <ProtocolForm patientId={patientId} />

      {/* Active protocols */}
      {protocols.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
            Active protocol{protocols.length > 1 ? "s" : ""}
          </h2>
          {protocols.map((p) => (
            <div
              key={p.id}
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
              >
                <strong>{p.protocol_name}</strong>
                {p.diet_type && <span className="badge">{p.diet_type}</span>}
                {p.start_date && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    from {p.start_date}
                  </span>
                )}
              </div>
              {p.daily_targets &&
                Object.keys(p.daily_targets).length > 0 && (
                  <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                    Targets:{" "}
                    {Object.entries(p.daily_targets)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")}
                  </p>
                )}
              {p.meal_timing && (
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Meal timing: {p.meal_timing}
                </p>
              )}
              {p.foods_to_emphasize && p.foods_to_emphasize.length > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Emphasize: {p.foods_to_emphasize.join(", ")}
                </p>
              )}
              {p.foods_to_avoid && p.foods_to_avoid.length > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Avoid: {p.foods_to_avoid.join(", ")}
                </p>
              )}
              {p.notes && (
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>{p.notes}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Macro summary of recent food logs */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Recent intake (avg per logged meal)
        </h2>
        {foodLogs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No food logs recorded yet.
          </p>
        ) : (
          <div className="stat-grid">
            <div className="stat">
              <div className="label">kcal</div>
              <div className="value">{avgKcal ?? "—"}</div>
            </div>
            <div className="stat">
              <div className="label">Protein</div>
              <div className="value">
                {avgProtein != null ? `${avgProtein} g` : "—"}
              </div>
            </div>
            <div className="stat">
              <div className="label">Carbs</div>
              <div className="value">
                {avgCarb != null ? `${avgCarb} g` : "—"}
              </div>
            </div>
            <div className="stat">
              <div className="label">Fat</div>
              <div className="value">
                {avgFat != null ? `${avgFat} g` : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Food log timeline */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Food log
        </h2>
        {foodLogs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No food logs yet.
          </p>
        ) : (
          foodLogs.map((log) => {
            const foods = Array.isArray(log.foods) ? log.foods : [];
            return (
              <div
                key={log.id}
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <div
                  style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
                >
                  {log.meal_type && (
                    <span className="badge">{log.meal_type}</span>
                  )}
                  <span className="muted" style={{ fontSize: 13 }}>
                    {fmtDate(log.logged_at)}
                  </span>
                  {log.total_kcal != null && (
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {log.total_kcal} kcal
                    </span>
                  )}
                </div>
                {foods.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14 }}>
                    {foods.map((f, i) => (
                      <li key={i}>
                        {f.name}
                        {f.qty != null ? ` — ${f.qty}${f.unit ? ` ${f.unit}` : ""}` : ""}
                        {f.kcal != null ? ` (${f.kcal} kcal)` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {log.notes && (
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>{log.notes}</p>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Supplement log timeline */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Supplement log
        </h2>
        {supplementLogs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No supplement logs yet.
          </p>
        ) : (
          supplementLogs.map((s) => (
            <div
              key={s.id}
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
              >
                <strong>{s.supplement_name}</strong>
                {s.dose && <span className="badge">{s.dose}</span>}
                <span className="muted" style={{ fontSize: 13 }}>
                  {fmtDate(s.logged_at)}
                </span>
              </div>
              {(s.timing || s.brand) && (
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
                  {[s.timing, s.brand].filter(Boolean).join(" · ")}
                </p>
              )}
              {s.notes && (
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>{s.notes}</p>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
