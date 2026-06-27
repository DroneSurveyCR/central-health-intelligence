import type { AnySupabaseClient } from "../connectors/types";

// Continuous-data alerting engine. Runs with the ADMIN (service-role) client from
// the cron route — it bypasses RLS, so every write MUST carry an explicit
// practice_id taken from the rule/patient row. Idempotent: the unique index
// uq_alerts_dedup (patient_id, dedup_key) makes duplicate inserts a no-op.

type Comparator = "gt" | "lt" | "gte" | "lte";
type Severity = "info" | "warn" | "urgent";

type RuleRow = {
  id: string;
  practice_id: string;
  name: string;
  metric: string;
  comparator: Comparator;
  threshold: number;
  severity: Severity;
  enabled: boolean;
};

// Default starter rules seeded for a practice that has none yet.
const DEFAULT_RULES: Array<{
  name: string;
  metric: string;
  comparator: Comparator;
  threshold: number;
  severity: Severity;
}> = [
  { name: "Elevated resting HR", metric: "resting_hr", comparator: "gt", threshold: 90, severity: "warn" },
  { name: "Low HRV", metric: "hrv_ms", comparator: "lt", threshold: 25, severity: "warn" },
  { name: "High average glucose", metric: "avg_glucose_mgdl", comparator: "gt", threshold: 180, severity: "urgent" },
  { name: "Low readiness", metric: "readiness_score", comparator: "lt", threshold: 40, severity: "warn" },
];

function compare(value: number, comparator: Comparator, threshold: number): boolean {
  switch (comparator) {
    case "gt":
      return value > threshold;
    case "lt":
      return value < threshold;
    case "gte":
      return value >= threshold;
    case "lte":
      return value <= threshold;
    default:
      return false;
  }
}

const COMPARATOR_SYMBOL: Record<Comparator, string> = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
};

/**
 * Insert the default starter rule set for `practiceId` if (and only if) the
 * practice currently has zero alert_rules. Safe to call repeatedly. Works with
 * either the RLS session client or the admin client; practice_id is set
 * explicitly so admin writes land in the right tenant.
 */
export async function seedDefaultRules(
  client: AnySupabaseClient,
  practiceId: string,
): Promise<number> {
  const { count } = await client
    .from("alert_rules")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", practiceId);
  if ((count ?? 0) > 0) return 0;

  const rows = DEFAULT_RULES.map((r) => ({ ...r, practice_id: practiceId, enabled: true }));
  const { error } = await client.from("alert_rules").insert(rows);
  if (error) return 0;
  return rows.length;
}

/**
 * Evaluate every practice's enabled alert_rules against each patient's LATEST
 * wearable_daily_summaries row and INSERT alerts for any threshold breach.
 * Returns the number of alerts created. Idempotent via the dedup unique index.
 */
export async function evaluateAlerts(admin: AnySupabaseClient): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: rules } = await admin
    .from("alert_rules")
    .select("id, practice_id, name, metric, comparator, threshold, severity, enabled")
    .eq("enabled", true);

  const enabledRules = (rules ?? []) as RuleRow[];
  if (enabledRules.length === 0) return 0;

  // Group rules by practice so we only scan each practice's patients once.
  const byPractice = new Map<string, RuleRow[]>();
  for (const rule of enabledRules) {
    const list = byPractice.get(rule.practice_id) ?? [];
    list.push(rule);
    byPractice.set(rule.practice_id, list);
  }

  // Metrics we actually need to read off the latest summary.
  const metrics = Array.from(new Set(enabledRules.map((r) => r.metric)));
  const summaryCols = Array.from(new Set(["patient_id", "date", ...metrics])).join(", ");

  let created = 0;

  for (const [practiceId, practiceRules] of byPractice) {
    // Patients in this practice that have wearable data. RLS is bypassed (admin),
    // so scope explicitly by practice_id.
    const { data: patients } = await admin
      .from("patients")
      .select("id")
      .eq("practice_id", practiceId)
      .is("deleted_at", null);

    for (const patient of (patients ?? []) as Array<{ id: string }>) {
      const { data: latest } = await admin
        .from("wearable_daily_summaries")
        .select(summaryCols)
        .eq("patient_id", patient.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) continue;
      const row = latest as Record<string, unknown>;

      for (const rule of practiceRules) {
        const raw = row[rule.metric];
        if (raw == null) continue;
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        if (!compare(value, rule.comparator, rule.threshold)) continue;

        const message = `${rule.name}: ${rule.metric} ${value} ${COMPARATOR_SYMBOL[rule.comparator]} ${rule.threshold}`;
        const { error } = await admin.from("alerts").insert({
          practice_id: practiceId,
          patient_id: patient.id,
          rule_id: rule.id,
          metric: rule.metric,
          value,
          severity: rule.severity,
          message,
          status: "open",
          dedup_key: `${rule.id}:${today}`,
        });

        // Duplicate-key (23505) means the alert for this rule+day already exists —
        // expected and ignored. Any other error is also swallowed so one bad row
        // doesn't abort the whole sweep.
        if (!error) created += 1;
      }
    }
  }

  return created;
}
