import { requirePatient } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import FoodQuickLog from "./FoodQuickLog";
import SupplementQuickLog from "./SupplementQuickLog";

type Food = {
  name?: string;
  qty?: number | null;
  unit?: string | null;
  kcal?: number | null;
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
};

type Protocol = {
  id: string;
  protocol_name: string;
  diet_type: string | null;
  daily_targets: Record<string, number> | null;
  foods_to_avoid: string[] | null;
  foods_to_emphasize: string[] | null;
  meal_timing: string | null;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/** Sum a numeric column over logs that fall on today's date, ignoring nulls. */
function sumToday(logs: FoodLog[], key: keyof FoodLog): number | null {
  const today = new Date().toDateString();
  const vals = logs
    .filter((l) => new Date(l.logged_at).toDateString() === today)
    .map((l) => l[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0));
}

export default async function PatientFoodPage() {
  const me = await requirePatient();
  await requireModule("nutrition");
  const supabase = await createClient();

  // PHI read by the patient on their own record — still audited.
  await logAudit({ action: "view", resource: "food_logs", patientId: me.id });

  const [{ data: foodData }, { data: suppData }, { data: protoData }] =
    await Promise.all([
      supabase
        .from("food_logs")
        .select(
          "id, logged_at, meal_type, foods, total_kcal, total_protein_g, total_carb_g, total_fat_g, notes",
        )
        .eq("patient_id", me.id)
        .order("logged_at", { ascending: false })
        .limit(30),
      supabase
        .from("supplement_logs")
        .select("id, logged_at, supplement_name, dose, timing")
        .eq("patient_id", me.id)
        .order("logged_at", { ascending: false })
        .limit(30),
      supabase
        .from("nutrition_protocols")
        .select(
          "id, protocol_name, diet_type, daily_targets, foods_to_avoid, foods_to_emphasize, meal_timing",
        )
        .eq("patient_id", me.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const foodLogs = (foodData ?? []) as FoodLog[];
  const supplementLogs = (suppData ?? []) as SupplementLog[];
  const protocol = (protoData ?? null) as Protocol | null;

  const todayKcal = sumToday(foodLogs, "total_kcal");
  const todayProtein = sumToday(foodLogs, "total_protein_g");
  const todayCarb = sumToday(foodLogs, "total_carb_g");
  const todayFat = sumToday(foodLogs, "total_fat_g");

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        Food &amp; nutrition
      </h1>
      <p className="muted">
        Log what you eat and the supplements you take
        {me.first_name ? `, ${me.first_name}` : ""}.
      </p>

      {protocol && (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="eyebrow">Your protocol</p>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <strong>{protocol.protocol_name}</strong>
            {protocol.diet_type && (
              <span className="badge">{protocol.diet_type}</span>
            )}
          </div>
          {protocol.daily_targets &&
            Object.keys(protocol.daily_targets).length > 0 && (
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                Daily targets:{" "}
                {Object.entries(protocol.daily_targets)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" · ")}
              </p>
            )}
          {protocol.meal_timing && (
            <p style={{ margin: "6px 0 0", fontSize: 14 }}>
              Meal timing: {protocol.meal_timing}
            </p>
          )}
          {protocol.foods_to_emphasize &&
            protocol.foods_to_emphasize.length > 0 && (
              <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                Emphasize: {protocol.foods_to_emphasize.join(", ")}
              </p>
            )}
          {protocol.foods_to_avoid && protocol.foods_to_avoid.length > 0 && (
            <p style={{ margin: "6px 0 0", fontSize: 14 }}>
              Avoid: {protocol.foods_to_avoid.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Today's totals */}
      <div className="stat-grid" style={{ marginTop: 18 }}>
        <div className="stat">
          <div className="label">Today kcal</div>
          <div className="value">{todayKcal ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="label">Protein</div>
          <div className="value">
            {todayProtein != null ? `${todayProtein} g` : "—"}
          </div>
        </div>
        <div className="stat">
          <div className="label">Carbs</div>
          <div className="value">
            {todayCarb != null ? `${todayCarb} g` : "—"}
          </div>
        </div>
        <div className="stat">
          <div className="label">Fat</div>
          <div className="value">{todayFat != null ? `${todayFat} g` : "—"}</div>
        </div>
      </div>

      <FoodQuickLog />
      <SupplementQuickLog />

      {/* Recent food logs */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Recent meals
        </h2>
        {foodLogs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing logged yet.
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
                    {fmtTime(log.logged_at)}
                  </span>
                  {log.total_kcal != null && (
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {log.total_kcal} kcal
                    </span>
                  )}
                </div>
                {foods.length > 0 && (
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                    {foods.map((f) => f.name).filter(Boolean).join(", ")}
                  </p>
                )}
                {log.notes && (
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    {log.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Recent supplements */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Recent supplements
        </h2>
        {supplementLogs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing logged yet.
          </p>
        ) : (
          supplementLogs.map((s) => (
            <div
              key={s.id}
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <strong>{s.supplement_name}</strong>
              {s.dose && <span className="badge">{s.dose}</span>}
              {s.timing && (
                <span className="muted" style={{ fontSize: 13 }}>
                  {s.timing}
                </span>
              )}
              <span className="muted" style={{ fontSize: 13, marginLeft: "auto" }}>
                {fmtTime(s.logged_at)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
