import type { SupabaseClient } from "@supabase/supabase-js";
import {
  statusOf,
  trendOf,
  type LabResult,
  type LabStatus,
  type LabTrend,
} from "@/lib/labs/helpers";
import {
  computeCurrentPhase,
  planProgressPct,
  groupItemsByPhaseAndLevel,
  type Plan,
  type PlanPhase,
  type PlanItem,
  type GroupedPhase,
  type GroupedLevel,
} from "@/lib/plan/helpers";

/**
 * Patient Progress Report — the "look how far you've come" capstone.
 *
 * A typed, defensively-assembled view of a patient's 90-day arc: baseline vs
 * now across labs, before/after on body scans, wellbeing then vs recent, and
 * the active plan. Everything is optional — missing data degrades gracefully so
 * the page can always render *something* meaningful.
 *
 * Pure assembly: all reads go through the passed (RLS-bound) server client.
 * No formatting / no JSX here — the page owns presentation + i18n.
 */

export type ReportReading = { value: number; date: string | null };

export type ReportLab = {
  marker: string;
  unit: string | null;
  baseline: ReportReading | null;
  latest: ReportReading;
  optimalLow: number | null;
  optimalHigh: number | null;
  status: LabStatus;
  trend: LabTrend;
};

export type ScanSystems = { date: string | null; systems: string[] };
export type ScanFinding = {
  system: string | null;
  severity: string | null;
  text: string | null;
};

export type ScanProgress =
  | { kind: "beforeAfter"; before: ScanSystems; after: ScanSystems }
  | { kind: "single"; date: string | null; findings: ScanFinding[] }
  | null;

export type ReportPlanItem = { name: string; detail: string | null; dose: string | null };
export type ReportPlanLevel = { level: string; items: ReportPlanItem[] };
export type ReportPlanPhase = {
  name: string;
  phaseNumber: number;
  levels: ReportPlanLevel[];
};

export type Report = {
  patient: { name: string; age: number | null; sex: string | null };
  plan: {
    title: string;
    dateRange: { start: string | null; end: string | null };
    currentPhase: string | null;
    progressPct: number;
  } | null;
  labs: ReportLab[];
  scanProgress: ScanProgress;
  wellbeing: {
    avgFeelStart: number | null;
    avgFeelRecent: number | null;
    adherencePct: number | null;
  };
  planItemsByLevel: ReportPlanPhase[];
};

/* ----------------------------- small coercers ----------------------------- */

function str(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const j = v.map((x) => String(x).trim()).filter(Boolean).join(", ");
    return j || null;
  }
  const s = String(v).trim();
  return s ? s : null;
}

function strList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
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

/** Ascending by collected_on, then created_at as a tiebreaker. */
function compareByDate(a: LabResult, b: LabResult): number {
  const da = a.collected_on ?? a.created_at;
  const db = b.collected_on ?? b.created_at;
  if (da < db) return -1;
  if (da > db) return 1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/* ------------------------------- assembly --------------------------------- */

export async function buildReport(
  // Loosely typed so any RLS-bound server client works without a generated DB type.
  supabase: SupabaseClient,
  patientId: string,
): Promise<Report | null> {
  const sinceRecent = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [
    { data: patient },
    { data: labData },
    { data: scanData },
    { data: planRows },
    { data: feelEarly },
    { data: feelRecent },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("first_name, last_name, sex, dob")
      .eq("id", patientId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("lab_results")
      .select(
        "id, patient_id, marker, value, unit, optimal_low, optimal_high, category, collected_on, created_at",
      )
      .eq("patient_id", patientId)
      .order("collected_on", { ascending: true }),
    // All scans, oldest → newest, so we can build a before/after.
    supabase
      .from("scans")
      .select("id, scan_date, created_at")
      .eq("patient_id", patientId)
      .order("scan_date", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
    // Recent plans (any status); we pick the best one in JS below.
    supabase
      .from("plans")
      .select("id, patient_id, practitioner_id, title, start_date, end_date, status")
      .eq("patient_id", patientId)
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(8),
    // Earliest few "how I feel" check-ins (the baseline mood).
    supabase
      .from("progress_logs")
      .select("value_json, logged_at")
      .eq("patient_id", patientId)
      .eq("kind", "how_i_feel")
      .order("logged_at", { ascending: true })
      .limit(5),
    // Recent "how I feel" check-ins (last 14 days).
    supabase
      .from("progress_logs")
      .select("value_json, logged_at")
      .eq("patient_id", patientId)
      .eq("kind", "how_i_feel")
      .gte("logged_at", sinceRecent)
      .order("logged_at", { ascending: false }),
  ]);

  if (!patient) return null;

  // Pick the most relevant plan: prefer active, then completed, then any
  // (rows already ordered by start_date desc, so first match wins).
  type PlanRow = {
    id: string;
    patient_id: string;
    practitioner_id: string | null;
    title: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string | null;
  };
  const allPlans = (planRows ?? []) as PlanRow[];
  const plan =
    allPlans.find((p) => p.status === "active") ??
    allPlans.find((p) => p.status === "completed") ??
    allPlans[0] ??
    null;

  const name =
    `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim() || "Patient";

  /* ---- labs: baseline (first reading) vs latest (last reading) per marker ---- */
  const rows = (labData ?? []) as LabResult[];
  const byMarker = new Map<string, LabResult[]>();
  for (const r of rows) {
    const list = byMarker.get(r.marker) ?? [];
    list.push(r);
    byMarker.set(r.marker, list);
  }

  const labs: ReportLab[] = [];
  for (const list of byMarker.values()) {
    if (list.length === 0) continue;
    const sorted = [...list].sort(compareByDate);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const low = last.optimal_low;
    const high = last.optimal_high;
    const hasBaseline = sorted.length > 1;

    labs.push({
      marker: last.marker,
      unit: last.unit,
      baseline: hasBaseline
        ? { value: first.value, date: first.collected_on ?? first.created_at }
        : null,
      latest: { value: last.value, date: last.collected_on ?? last.created_at },
      optimalLow: low,
      optimalHigh: high,
      status: statusOf(last.value, low, high),
      // Trend judged baseline → latest when we have both readings.
      trend: trendOf(last.value, hasBaseline ? first.value : null, low, high),
    });
  }
  labs.sort((a, b) => a.marker.localeCompare(b.marker));

  /* ---- scan progress: before/after if ≥2 scans, else single, else null ---- */
  const scans = (scanData ?? []) as {
    id: string;
    scan_date: string | null;
    created_at: string;
  }[];

  let scanProgress: ScanProgress = null;
  if (scans.length >= 2) {
    const before = scans[0];
    const after = scans[scans.length - 1];
    const [beforeSystems, afterSystems] = await Promise.all([
      topSystemsForScan(supabase, before.id),
      topSystemsForScan(supabase, after.id),
    ]);
    scanProgress = {
      kind: "beforeAfter",
      before: { date: before.scan_date ?? before.created_at, systems: beforeSystems },
      after: { date: after.scan_date ?? after.created_at, systems: afterSystems },
    };
  } else if (scans.length === 1) {
    const only = scans[0];
    const findings = await findingsForScan(supabase, only.id);
    scanProgress = {
      kind: "single",
      date: only.scan_date ?? only.created_at,
      findings,
    };
  }

  /* ---- plan: phase, progress, grouped items ---- */
  let reportPlan: Report["plan"] = null;
  let planItemsByLevel: ReportPlanPhase[] = [];

  if (plan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: phasesData }, { data: itemsData }] = await Promise.all([
      supabase
        .from("plan_phases")
        .select("id, plan_id, phase_number, name, start_offset_days, end_offset_days")
        .eq("plan_id", plan.id)
        .order("phase_number", { ascending: true }),
      supabase
        .from("plan_items")
        .select("id, plan_id, phase_id, level, name, detail, dose")
        .eq("plan_id", plan.id),
    ]);

    const phases = (phasesData ?? []) as PlanPhase[];
    const items = (itemsData ?? []) as PlanItem[];

    const planLite: Plan = {
      id: plan.id,
      patient_id: plan.patient_id,
      practitioner_id: plan.practitioner_id ?? null,
      title: plan.title ?? null,
      start_date: plan.start_date ?? null,
      end_date: plan.end_date ?? null,
      status: (plan.status ?? "draft") as Plan["status"],
    };

    const phase = computeCurrentPhase(planLite, phases, today);

    reportPlan = {
      title: str(plan.title) ?? "Care plan",
      dateRange: { start: str(plan.start_date), end: str(plan.end_date) },
      currentPhase: phase ? (str(phase.name) ?? `Phase ${phase.phase_number}`) : null,
      progressPct: planProgressPct(planLite, today, phases),
    };

    const grouped = groupItemsByPhaseAndLevel(phases, items);
    planItemsByLevel = grouped.phases
      .filter((gp: GroupedPhase) => gp.itemCount > 0)
      .map((gp: GroupedPhase) => ({
        name: str(gp.phase.name) ?? `Phase ${gp.phase.phase_number}`,
        phaseNumber: gp.phase.phase_number,
        levels: gp.levels.map((gl: GroupedLevel) => ({
          level: gl.level,
          items: gl.items.map((it) => ({
            name: it.name,
            detail: it.detail,
            dose: it.dose,
          })),
        })),
      }));

    // Items not assigned to any phase collect under a synthetic bucket.
    if (grouped.unassigned.length > 0) {
      planItemsByLevel.push({
        name: "Ongoing",
        phaseNumber: planItemsByLevel.length + 1,
        levels: grouped.unassigned.map((gl: GroupedLevel) => ({
          level: gl.level,
          items: gl.items.map((it) => ({
            name: it.name,
            detail: it.detail,
            dose: it.dose,
          })),
        })),
      });
    }
  }

  /* ---- wellbeing: avg feeling start vs recent + simple adherence ---- */
  const avgFeelStart = avgScore(feelEarly);
  const avgFeelRecent = avgScore(feelRecent);

  let adherencePct: number | null = null;
  if (reportPlan && plan) {
    const since14 = new Date();
    since14.setDate(since14.getDate() - 14);
    const [{ data: completions }, { count: itemCount }] = await Promise.all([
      supabase
        .from("plan_completions")
        .select("completed")
        .eq("patient_id", patientId)
        .gte("date", since14.toISOString().slice(0, 10)),
      supabase
        .from("plan_items")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", plan.id),
    ]);
    const rows2 = (completions ?? []) as { completed: boolean | null }[];
    const expected = (itemCount ?? 0) * 14;
    if (expected > 0) {
      const done = rows2.filter((c) => c.completed).length;
      adherencePct = Math.min(100, Math.round((done / expected) * 100));
    } else if (rows2.length > 0) {
      const done = rows2.filter((c) => c.completed).length;
      adherencePct = Math.round((done / rows2.length) * 100);
    }
  }

  return {
    patient: {
      name,
      age: ageFromDob(patient.dob),
      sex: str(patient.sex),
    },
    plan: reportPlan,
    labs,
    scanProgress,
    wellbeing: { avgFeelStart, avgFeelRecent, adherencePct },
    planItemsByLevel,
  };
}

/* --------------------------- scan sub-queries ----------------------------- */

async function topSystemsForScan(
  supabase: SupabaseClient,
  scanId: string,
): Promise<string[]> {
  // Prefer the scan's parsed top_systems; fall back to distinct finding systems.
  const { data: scan } = await supabase
    .from("scans")
    .select("parsed_findings")
    .eq("id", scanId)
    .maybeSingle();
  const fromParsed = strList(asRecord(scan?.parsed_findings).top_systems).slice(0, 5);
  if (fromParsed.length > 0) return fromParsed;

  const findings = await findingsForScan(supabase, scanId);
  const seen: string[] = [];
  for (const f of findings) {
    const s = f.system?.trim();
    if (s && !seen.includes(s)) seen.push(s);
  }
  return seen.slice(0, 5);
}

async function findingsForScan(
  supabase: SupabaseClient,
  scanId: string,
): Promise<ScanFinding[]> {
  const { data } = await supabase
    .from("body_map_findings")
    .select("system, severity, finding_text")
    .eq("scan_id", scanId);
  const rows = (data ?? []) as {
    system: string | null;
    severity: string | null;
    finding_text: string | null;
  }[];
  return rows.map((r) => ({
    system: str(r.system),
    severity: str(r.severity),
    text: str(r.finding_text),
  }));
}

/* ----------------------------- wellbeing ---------------------------------- */

function avgScore(
  logs: { value_json: unknown }[] | null | undefined,
): number | null {
  const scores = (logs ?? [])
    .map((l) => num(asRecord(l.value_json).score))
    .filter((n): n is number => n != null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
