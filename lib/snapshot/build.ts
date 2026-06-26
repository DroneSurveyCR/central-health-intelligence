import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Patient Snapshot — an at-a-glance clinical summary the doctor sees.
 * Everything is optional/defensive: missing data degrades gracefully.
 */
export type Snapshot = {
  name: string;
  age: number | null;
  sex: string | null;
  goals: string[];
  flags: string[];
  activePlan: {
    title: string;
    currentPhaseName: string | null;
    daysRemaining: number | null;
  } | null;
  latestScan: {
    date: string | null;
    topSystems: string[];
  } | null;
  trend: {
    avgFeel7d: number | null;
    latestVital: string | null;
  };
};

/** Coerce a jsonb value into a trimmed non-empty string, else null. */
function str(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const joined = v.map((x) => String(x).trim()).filter(Boolean).join(", ");
    return joined || null;
  }
  const s = String(v).trim();
  return s ? s : null;
}

/** Coerce a jsonb value into a list of non-empty strings. */
function strList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
}

function ageFromDob(dob: unknown): number | null {
  const s = str(dob);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86_400_000);
}

export async function buildSnapshot(
  // Loosely typed so any server client (RLS-bound) works without a generated DB type.
  supabase: SupabaseClient,
  patientId: string,
): Promise<Snapshot | null> {
  // --- batch all independent queries in parallel ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: patient },
    { data: intake },
    { data: plan },
    { data: scan },
    { data: feels },
    { data: vital },
  ] = await Promise.all([
    // patient core
    supabase
      .from("patients")
      .select("first_name, last_name, sex, dob")
      .eq("id", patientId)
      .is("deleted_at", null)
      .maybeSingle(),
    // intake (latest)
    supabase
      .from("intake_forms")
      .select("form_data")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // active plan
    supabase
      .from("plans")
      .select("id, title, start_date, end_date, status")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // latest scan
    supabase
      .from("scans")
      .select("scan_date, parsed_findings")
      .eq("patient_id", patientId)
      .order("scan_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    // how_i_feel logs (last 7 days)
    supabase
      .from("progress_logs")
      .select("value_json, logged_at")
      .eq("patient_id", patientId)
      .eq("kind", "how_i_feel")
      .gte("logged_at", sevenDaysAgo)
      .order("logged_at", { ascending: false }),
    // latest vital
    supabase
      .from("progress_logs")
      .select("value_json, logged_at")
      .eq("patient_id", patientId)
      .eq("kind", "vital")
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!patient) return null;

  const name = `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim() || "Patient";
  const age = ageFromDob(patient.dob);
  const sex = str(patient.sex);

  const fd = (intake?.form_data ?? {}) as Record<string, unknown>;

  // Goals: main goals/concerns text + any selected goal-ish fields.
  const goals: string[] = [];
  for (const key of ["main_goals", "goals", "primary_concern", "concerns", "chief_complaint"]) {
    goals.push(...strList(fd[key]));
  }

  // Flags: notable intake items — conditions, diagnoses, medications.
  const flags: string[] = [];
  for (const key of ["conditions", "diagnoses_5yr", "diagnoses", "medications", "allergies"]) {
    flags.push(...strList(fd[key]));
  }

  // --- active plan + current phase ---
  let activePlan: Snapshot["activePlan"] = null;
  if (plan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentPhaseName: string | null = null;
    let daysRemaining: number | null = null;

    const start = str(plan.start_date) ? new Date((str(plan.start_date) as string) + "T00:00:00") : null;
    const end = str(plan.end_date) ? new Date((str(plan.end_date) as string) + "T00:00:00") : null;

    if (end && !Number.isNaN(end.getTime())) {
      daysRemaining = Math.max(0, daysBetween(today, end));
    }

    if (start && !Number.isNaN(start.getTime())) {
      const elapsed = daysBetween(start, today); // days since plan start (can be negative)
      const { data: phases } = await supabase
        .from("plan_phases")
        .select("phase_number, name, start_offset_days, end_offset_days")
        .eq("plan_id", plan.id)
        .order("phase_number", { ascending: true });

      const list = phases ?? [];
      // current phase: elapsed within [start_offset, end_offset]; inclusive of start.
      const match = list.find((ph) => {
        const so = ph.start_offset_days ?? 0;
        const eo = ph.end_offset_days;
        return elapsed >= so && (eo == null || elapsed <= eo);
      });
      const chosen = match ?? (elapsed < 0 ? list[0] : list[list.length - 1]);
      currentPhaseName = chosen ? (str(chosen.name) ?? `Phase ${chosen.phase_number}`) : null;
    }

    activePlan = {
      title: str(plan.title) ?? "Care plan",
      currentPhaseName,
      daysRemaining,
    };
  }

  // --- latest scan ---
  let latestScan: Snapshot["latestScan"] = null;
  if (scan) {
    const findings = (scan.parsed_findings ?? {}) as Record<string, unknown>;
    latestScan = {
      date: str(scan.scan_date),
      topSystems: strList(findings.top_systems).slice(0, 6),
    };
  }

  // --- trend: avg "how_i_feel" score over last 7 days + latest vital (BP) ---
  let avgFeel7d: number | null = null;
  if (feels && feels.length > 0) {
    const scores = feels
      .map((r) => {
        const v = (r.value_json ?? {}) as Record<string, unknown>;
        const n = Number(v.score);
        return Number.isFinite(n) ? n : null;
      })
      .filter((n): n is number => n != null);
    if (scores.length > 0) {
      avgFeel7d = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
  }

  let latestVital: string | null = null;
  if (vital) {
    const v = (vital.value_json ?? {}) as Record<string, unknown>;
    const sys = v.systolic;
    const dia = v.diastolic;
    if (sys != null && dia != null) {
      latestVital = `${sys}/${dia} mmHg`;
    }
  }

  return {
    name,
    age,
    sex,
    goals,
    flags,
    activePlan,
    latestScan,
    trend: { avgFeel7d, latestVital },
  };
}
