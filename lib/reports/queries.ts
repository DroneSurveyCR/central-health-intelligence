import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

// The three financial reports in REPORTS v1. Keys are URL-safe and used both as
// the ?report= tab on the hub and as the /api/reports/[report] path segment.
export type ReportKey = "daily-transactions" | "invoices" | "outstanding";

export const REPORTS: { key: ReportKey; title: string; desc: string }[] = [
  {
    key: "daily-transactions",
    title: "Daily Transactions",
    desc: "Payments received, grouped by day and method.",
  },
  {
    key: "invoices",
    title: "Invoices",
    desc: "Invoices issued in the period, with status and totals.",
  },
  {
    key: "outstanding",
    title: "Outstanding / AR",
    desc: "Unpaid invoices, aged into 30-day buckets.",
  },
];

export const REPORT_KEYS = REPORTS.map((r) => r.key);

export function isReportKey(v: string): v is ReportKey {
  return (REPORT_KEYS as string[]).includes(v);
}

// Payment methods, mirrors the invoices.payment_method / payments.method CHECK
// constraint (cash | bitcoin | zelle | stripe) so the Daily Transactions report
// always shows a stable, full set of method columns.
export const PAYMENT_METHODS = ["cash", "bitcoin", "zelle", "stripe"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bitcoin: "Bitcoin",
  zelle: "Zelle",
  stripe: "Stripe",
};

export function methodLabel(m: string | null): string {
  if (!m) return "—";
  return METHOD_LABELS[m] ?? m;
}

// ---- month helpers ---------------------------------------------------------

/** Current month as YYYY-MM (UTC, matches how timestamps are stored). */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Validate a YYYY-MM string; fall back to the current month. */
export function normalizeMonth(v: string | null | undefined): string {
  if (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return v;
  return currentMonth();
}

/** Inclusive ISO bounds for a YYYY-MM month: [first day 00:00, next month 00:00). */
export function monthBounds(month: string): { startISO: string; endISO: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // first instant of next month
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/** Human label for a month, e.g. "June 2026". */
export function monthLabel(month: string): string {
  const { startISO } = monthBounds(month);
  return new Date(startISO).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---- formatting ------------------------------------------------------------

export const money = (n: number | null | undefined): string =>
  `$${(Number(n) || 0).toFixed(2)}`;

const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};
export const statusLabel = (s: string | null): string =>
  s ? STATUS_LABELS[s] ?? s : "—";

// Lightweight name resolution: invoices/payments have no FK embed to patients,
// so we batch-fetch the names we need and look them up by id.
async function patientNames(
  supabase: DB,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .in("id", unique);
  for (const p of (data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[]) {
    out.set(p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—");
  }
  return out;
}

// ===========================================================================
// Report 1 — Daily Transactions (the payments ledger, grouped by day + method)
// ===========================================================================

export type DailyRow = {
  day: string; // YYYY-MM-DD
  count: number;
  byMethod: Record<PaymentMethod, number>;
  total: number;
};

export type DailyReport = {
  kind: "daily";
  month: string;
  rows: DailyRow[];
  totals: { count: number; byMethod: Record<PaymentMethod, number>; total: number };
};

async function dailyTransactions(
  supabase: DB,
  month: string,
): Promise<DailyReport> {
  const { startISO, endISO } = monthBounds(month);
  const { data } = await supabase
    .from("payments")
    .select("amount, method, created_at")
    .gte("created_at", startISO)
    .lt("created_at", endISO)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as {
    amount: number | null;
    method: string | null;
    created_at: string | null;
  }[];

  const blank = (): Record<PaymentMethod, number> => ({
    cash: 0,
    bitcoin: 0,
    zelle: 0,
    stripe: 0,
  });

  const byDay = new Map<string, DailyRow>();
  const totals = { count: 0, byMethod: blank(), total: 0 };

  for (const p of rows) {
    const day = (p.created_at ?? "").slice(0, 10) || "—";
    const amt = Number(p.amount) || 0;
    const method = (p.method ?? "") as PaymentMethod;
    const row =
      byDay.get(day) ?? { day, count: 0, byMethod: blank(), total: 0 };
    row.count += 1;
    row.total += amt;
    if (method in row.byMethod) row.byMethod[method] += amt;
    byDay.set(day, row);

    totals.count += 1;
    totals.total += amt;
    if (method in totals.byMethod) totals.byMethod[method] += amt;
  }

  const out = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return { kind: "daily", month, rows: out, totals };
}

// ===========================================================================
// Report 2 — Invoices (issued in the period)
// ===========================================================================

export type InvoiceRow = {
  number: string;
  patient: string;
  status: string;
  total: number;
  currency: string;
  paidAt: string; // formatted or "—"
  paidAtRaw: string | null;
};

export type InvoiceReport = {
  kind: "invoices";
  month: string;
  rows: InvoiceRow[];
  total: number;
};

async function invoicesReport(
  supabase: DB,
  month: string,
): Promise<InvoiceReport> {
  const { startISO, endISO } = monthBounds(month);
  const { data } = await supabase
    .from("invoices")
    .select("number, patient_id, status, total, currency, paid_at, issued_at")
    .gte("issued_at", startISO)
    .lt("issued_at", endISO)
    .order("issued_at", { ascending: false });

  const raw = (data ?? []) as {
    number: string | null;
    patient_id: string;
    status: string | null;
    total: number | null;
    currency: string | null;
    paid_at: string | null;
    issued_at: string | null;
  }[];

  const names = await patientNames(
    supabase,
    raw.map((r) => r.patient_id),
  );

  let total = 0;
  const rows = raw.map((r) => {
    total += Number(r.total) || 0;
    return {
      number: r.number ?? "—",
      patient: names.get(r.patient_id) ?? "—",
      status: r.status ?? "—",
      total: Number(r.total) || 0,
      currency: (r.currency ?? "USD").toUpperCase(),
      paidAt: fmtDate(r.paid_at),
      paidAtRaw: r.paid_at,
    } satisfies InvoiceRow;
  });

  return { kind: "invoices", month, rows, total };
}

// ===========================================================================
// Report 3 — Outstanding / AR (unpaid invoices, aged)
// ===========================================================================

export const AR_BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
export type ArBucket = (typeof AR_BUCKETS)[number];

function bucketFor(days: number): ArBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export type ArRow = {
  number: string;
  patient: string;
  status: string;
  dueOn: string; // formatted or "—"
  daysOverdue: number; // 0 if not yet due
  bucket: ArBucket;
  total: number;
};

export type ArReport = {
  kind: "outstanding";
  rows: ArRow[];
  buckets: Record<ArBucket, number>;
  total: number;
};

/**
 * Outstanding AR = invoices in status draft/sent (i.e. not paid, not void).
 * Aged by how far past due_on they are (using today). Not yet due => 0-30.
 * This report is a live snapshot and ignores the month selector.
 */
async function outstandingReport(supabase: DB): Promise<ArReport> {
  const { data } = await supabase
    .from("invoices")
    .select("number, patient_id, status, total, due_on, issued_at")
    .in("status", ["draft", "sent"])
    .order("due_on", { ascending: true, nullsFirst: false });

  const raw = (data ?? []) as {
    number: string | null;
    patient_id: string;
    status: string | null;
    total: number | null;
    due_on: string | null;
    issued_at: string | null;
  }[];

  const names = await patientNames(
    supabase,
    raw.map((r) => r.patient_id),
  );

  const now = Date.now();
  const DAY = 86_400_000;
  const buckets: Record<ArBucket, number> = {
    "0-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  let total = 0;

  const rows = raw.map((r) => {
    const amt = Number(r.total) || 0;
    // Age basis: due_on if present, else issued_at (so undated invoices still age).
    const basis = r.due_on ?? r.issued_at;
    const overdue = basis
      ? Math.max(0, Math.floor((now - new Date(basis).getTime()) / DAY))
      : 0;
    const bucket = bucketFor(overdue);
    buckets[bucket] += amt;
    total += amt;
    return {
      number: r.number ?? "—",
      patient: names.get(r.patient_id) ?? "—",
      status: r.status ?? "—",
      dueOn: fmtDate(r.due_on),
      daysOverdue: overdue,
      bucket,
      total: amt,
    } satisfies ArRow;
  });

  return { kind: "outstanding", rows, buckets, total };
}

// ===========================================================================
// Dispatch + CSV
// ===========================================================================

export type ReportResult = DailyReport | InvoiceReport | ArReport;

export async function runReport(
  supabase: DB,
  key: ReportKey,
  month: string,
): Promise<ReportResult> {
  if (key === "daily-transactions") return dailyTransactions(supabase, month);
  if (key === "invoices") return invoicesReport(supabase, month);
  return outstandingReport(supabase);
}

/** RFC-4180-ish CSV cell escaping. */
function esc(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const row = (cells: (string | number)[]) => cells.map(esc).join(",");

/** Serialize a report result to CSV text. */
export function reportToCSV(result: ReportResult): string {
  const lines: string[] = [];

  if (result.kind === "daily") {
    lines.push(
      row([
        "Date",
        "Payments",
        ...PAYMENT_METHODS.map((m) => METHOD_LABELS[m]),
        "Day total",
      ]),
    );
    for (const r of result.rows) {
      lines.push(
        row([
          r.day,
          r.count,
          ...PAYMENT_METHODS.map((m) => (Number(r.byMethod[m]) || 0).toFixed(2)),
          r.total.toFixed(2),
        ]),
      );
    }
    lines.push(
      row([
        "TOTAL",
        result.totals.count,
        ...PAYMENT_METHODS.map((m) =>
          (Number(result.totals.byMethod[m]) || 0).toFixed(2),
        ),
        result.totals.total.toFixed(2),
      ]),
    );
    return lines.join("\r\n");
  }

  if (result.kind === "invoices") {
    lines.push(row(["Number", "Patient", "Status", "Total", "Currency", "Paid at"]));
    for (const r of result.rows) {
      lines.push(
        row([
          r.number,
          r.patient,
          statusLabel(r.status),
          r.total.toFixed(2),
          r.currency,
          r.paidAtRaw ? r.paidAtRaw.slice(0, 10) : "",
        ]),
      );
    }
    lines.push(row(["TOTAL", "", "", result.total.toFixed(2), "", ""]));
    return lines.join("\r\n");
  }

  // outstanding
  lines.push(
    row(["Number", "Patient", "Status", "Due on", "Days overdue", "Bucket", "Total"]),
  );
  for (const r of result.rows) {
    lines.push(
      row([
        r.number,
        r.patient,
        statusLabel(r.status),
        r.dueOn === "—" ? "" : r.dueOn,
        r.daysOverdue,
        r.bucket,
        r.total.toFixed(2),
      ]),
    );
  }
  lines.push(row(["TOTAL", "", "", "", "", "", result.total.toFixed(2)]));
  // bucket summary footer
  for (const b of AR_BUCKETS) {
    lines.push(row([`Bucket ${b} days`, "", "", "", "", "", result.buckets[b].toFixed(2)]));
  }
  return lines.join("\r\n");
}

/** CSV download filename for a report/month. */
export function csvFilename(key: ReportKey, month: string): string {
  if (key === "outstanding") return `outstanding-ar.csv`;
  return `${key}_${month}.csv`;
}
