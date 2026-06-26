// Pure data assembly for the staff Analytics dashboard (the practice cockpit).
// Takes an RLS-scoped server Supabase client; staff only see their own patients.
// Defensive throughout: counts via { head: true } where possible, sums computed
// client-side, every query tolerates null data.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Point = { x: string; y: number };
export type Bar = { label: string; value: number };

export type Metrics = {
  totalPatients: number;
  newPatients30d: number;
  newPatientsPrev30d: number; // the 30 days before that (for delta)
  newPatientsDeltaPct: number | null; // % change vs prior 30d, null if no baseline
  upcomingAppts: number; // next 30 days
  apptsThisWeek: number; // next 7 days
  activePlans: number;
  activePlanRate: number; // % of patients with an active plan (0–100)
  revenueAllTime: number;
  revenue30d: number;
  revenuePrev30d: number; // the 30 days before that (for delta)
  revenueDeltaPct: number | null; // % change vs prior 30d, null if no baseline
  ordersCount: number;
  ordersRevenue: number;
  newPatientsSeries: Point[]; // 12 weeks
  newPatientsSpark: number[]; // 12 weeks, bare values for <Sparkline>
  revenueSpark: number[]; // 12 weeks, bare values for <Sparkline>
  revenueByWeekSeries: Bar[]; // 12 weeks
};

/** Percent change a→b, null when there's no prior baseline to compare against. */
function deltaPct(prev: number, curr: number): number | null {
  if (!Number.isFinite(prev) || prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Monday-anchored short week label, e.g. "Jun 16". */
function weekLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Start-of-week (local Monday) for a given date. */
function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - dow);
  return out;
}

/** Build 12 consecutive week buckets ending with the current week. */
function buildWeekBuckets(): { start: Date; label: string; key: string }[] {
  const thisWeek = weekStart(new Date());
  const buckets: { start: Date; label: string; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(thisWeek.getTime() - i * WEEK);
    buckets.push({ start, label: weekLabel(start), key: start.toISOString() });
  }
  return buckets;
}

/** Find the bucket index for a timestamp, or -1 if before the window. */
function bucketIndex(
  buckets: { start: Date }[],
  iso: string | null | undefined,
): number {
  if (!iso) return -1;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return -1;
  const firstStart = buckets[0].start.getTime();
  if (t < firstStart) return -1;
  const idx = Math.floor((t - firstStart) / WEEK);
  return idx >= 0 && idx < buckets.length ? idx : -1;
}

export async function buildMetrics(
  supabase: SupabaseClient,
): Promise<Metrics> {
  const now = new Date();
  const since30 = isoDaysAgo(30);
  const since60 = isoDaysAgo(60);
  const next30 = isoDaysAhead(30);
  const next7 = isoDaysAhead(7);
  const twelveWeeksAgo = isoDaysAgo(7 * 12);

  // --- Cheap counts via head:true (RLS-scoped) ---
  const [
    totalPatientsRes,
    newPatientsRes,
    newPatientsPrevRes,
    upcomingApptsRes,
    apptsThisWeekRes,
    activePlansRes,
    ordersCountRes,
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", since30),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", since60)
      .lt("created_at", since30),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_time", now.toISOString())
      .lte("start_time", next30)
      .neq("status", "cancelled"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_time", now.toISOString())
      .lte("start_time", next7)
      .neq("status", "cancelled"),
    supabase
      .from("plans")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true }),
  ]);

  // --- Row pulls for client-side sums + week series ---
  const [paymentsRes, paymentsRecentRes, ordersRes, newPatientRowsRes] =
    await Promise.all([
      // All-time payment amounts (for all-time revenue).
      supabase.from("payments").select("amount"),
      // Last 12 weeks of payments (for revenue-by-week + last30d).
      supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", twelveWeeksAgo),
      // Orders for revenue contribution.
      supabase.from("orders").select("total"),
      // New patient created_at over the last 12 weeks for the line series.
      supabase
        .from("patients")
        .select("created_at")
        .is("deleted_at", null)
        .gte("created_at", twelveWeeksAgo),
    ]);

  const allPayments = paymentsRes.data ?? [];
  const recentPayments = paymentsRecentRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const newPatientRows = newPatientRowsRes.data ?? [];

  const revenueAllTime = allPayments.reduce(
    (sum, p) => sum + toNum((p as { amount: unknown }).amount),
    0,
  );

  const since30Ms = Date.parse(since30);
  const since60Ms = Date.parse(since60);

  const revenue30d = recentPayments.reduce((sum, p) => {
    const row = p as { amount: unknown; created_at: string | null };
    if (row.created_at && new Date(row.created_at).getTime() >= since30Ms) {
      return sum + toNum(row.amount);
    }
    return sum;
  }, 0);

  const revenuePrev30d = recentPayments.reduce((sum, p) => {
    const row = p as { amount: unknown; created_at: string | null };
    if (!row.created_at) return sum;
    const t = new Date(row.created_at).getTime();
    if (t >= since60Ms && t < since30Ms) return sum + toNum(row.amount);
    return sum;
  }, 0);

  const ordersRevenue = orders.reduce(
    (sum, o) => sum + toNum((o as { total: unknown }).total),
    0,
  );

  // --- Week buckets ---
  const buckets = buildWeekBuckets();

  const newPatientCounts = new Array(buckets.length).fill(0);
  for (const row of newPatientRows) {
    const idx = bucketIndex(buckets, (row as { created_at: string | null }).created_at);
    if (idx >= 0) newPatientCounts[idx] += 1;
  }

  const revenueByWeek = new Array(buckets.length).fill(0);
  for (const row of recentPayments) {
    const r = row as { amount: unknown; created_at: string | null };
    const idx = bucketIndex(buckets, r.created_at);
    if (idx >= 0) revenueByWeek[idx] += toNum(r.amount);
  }

  const newPatientsSeries: Point[] = buckets.map((b, i) => ({
    x: b.label,
    y: newPatientCounts[i],
  }));

  const revenueByWeekSeries: Bar[] = buckets.map((b, i) => ({
    label: b.label,
    value: Math.round(revenueByWeek[i] * 100) / 100,
  }));

  const totalPatients = totalPatientsRes.count ?? 0;
  const activePlans = activePlansRes.count ?? 0;
  const newPatients30d = newPatientsRes.count ?? 0;
  const newPatientsPrev30d = newPatientsPrevRes.count ?? 0;

  const activePlanRate =
    totalPatients > 0
      ? Math.round(Math.min(100, (activePlans / totalPatients) * 100))
      : 0;

  return {
    totalPatients,
    newPatients30d,
    newPatientsPrev30d,
    newPatientsDeltaPct: deltaPct(newPatientsPrev30d, newPatients30d),
    upcomingAppts: upcomingApptsRes.count ?? 0,
    apptsThisWeek: apptsThisWeekRes.count ?? 0,
    activePlans,
    activePlanRate,
    revenueAllTime,
    revenue30d,
    revenuePrev30d,
    revenueDeltaPct: deltaPct(revenuePrev30d, revenue30d),
    ordersCount: ordersCountRes.count ?? 0,
    ordersRevenue,
    newPatientsSeries,
    newPatientsSpark: newPatientCounts.map((n) => toNum(n)),
    revenueSpark: revenueByWeek.map((n) => Math.round(toNum(n) * 100) / 100),
    revenueByWeekSeries,
  };
}
