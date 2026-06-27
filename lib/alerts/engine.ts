import type { AnySupabaseClient } from "../connectors/types";
import { notify } from "../notifications/create";

// Continuous-data alerting engine. Runs with the ADMIN (service-role) client from
// the cron route — it bypasses RLS, so every write MUST carry an explicit
// practice_id taken from the rule/patient row. Idempotent: the unique index
// uq_alerts_dedup (patient_id, dedup_key) makes duplicate inserts a no-op.
//
// DELIVERY: every genuinely-new alert row also spawns an in-app notification
// (kind 'alert', link '/triage') for the practice's care team. The notification
// reuses the alert's dedup_key, so the SAME rule+patient cannot notify more than
// once per 24h (uq_notifications_dedup gives daily idempotency, matching alerts).

type Comparator = "gt" | "lt" | "gte" | "lte";
type Severity = "info" | "warn" | "urgent";

// ---------------------------------------------------------------------------
// Alert-fatigue tuning knobs.
// ---------------------------------------------------------------------------
// HYSTERESIS_BAND (default OFF / 0): when > 0, a value that is only MARGINALLY
// over the threshold is treated as noise and skipped. "Marginally" = within this
// FRACTION of the threshold. e.g. 0.05 = a value within 5% of the threshold on
// the breach side does NOT fire. Raise it per-practice if a rule is too chatty.
// Set via env so ops can tune without a deploy; 0 keeps today's behavior exactly.
const HYSTERESIS_BAND = (() => {
  const raw = Number(process.env.ALERT_HYSTERESIS_BAND ?? "0");
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
})();

/**
 * True when a breaching `value` is only marginally past `threshold` and should
 * be suppressed under the configured hysteresis band. No-op when band is 0.
 * The required margin scales with the threshold magnitude so it works across
 * very different metric ranges (HR ~90 vs HRV ~25 vs glucose ~180).
 */
function withinHysteresis(value: number, threshold: number, comparator: Comparator): boolean {
  if (HYSTERESIS_BAND <= 0) return false;
  const margin = Math.abs(threshold) * HYSTERESIS_BAND;
  switch (comparator) {
    case "gt":
    case "gte":
      // Over-threshold breach: suppress if it has not cleared threshold+margin.
      return value < threshold + margin;
    case "lt":
    case "lte":
      // Under-threshold breach: suppress if it has not cleared threshold-margin.
      return value > threshold - margin;
    default:
      return false;
  }
}

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

        // Tuning: skip values that only marginally breach the threshold when a
        // hysteresis band is configured (default off — no behavior change).
        if (withinHysteresis(value, rule.threshold, rule.comparator)) continue;

        const dedupKey = `${rule.id}:${today}`;
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
          dedup_key: dedupKey,
        });

        // Duplicate-key (23505) means the alert for this rule+day already exists —
        // expected and ignored. Any other error is also swallowed so one bad row
        // doesn't abort the whole sweep.
        if (!error) {
          created += 1;

          // DELIVERY + fatigue tuning. One notification per NEW alert, addressed
          // practice-wide (recipient_* null -> the whole care team sees it).
          // - Reuses the alert dedup_key so the SAME rule+patient can't notify
          //   more than once per 24h (uq_notifications_dedup), staying in lockstep
          //   with the alert dedup. Belt-and-suspenders: we only get here when the
          //   alert insert itself was NOT a duplicate, so this is doubly idempotent.
          // - Only `urgent` interrupts (notify() derives interrupt from severity),
          //   so warn/info alerts ride quietly in the feed and don't add to the
          //   "interrupting" badge — the core anti-fatigue lever.
          await notify(admin, {
            practiceId,
            kind: "alert",
            title: rule.name,
            body: message,
            link: "/triage",
            severity: rule.severity,
            dedupKey: `alert:${dedupKey}`,
          });
        }
      }
    }
  }

  return created;
}
