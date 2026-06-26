import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

export type ReportKey = "transactions" | "invoices" | "receivables";

export type ReportData = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  total?: number; // summary money total where meaningful
};

export const REPORTS: { key: ReportKey; title: string; desc: string }[] = [
  { key: "transactions", title: "Daily Transactions", desc: "Payments received, by day." },
  { key: "invoices", title: "Invoices", desc: "All invoices issued in the range." },
  { key: "receivables", title: "Accounts Receivable", desc: "Unpaid invoices (money owed)." },
];

type InvoiceRow = {
  number: string | null;
  total: number | null;
  status: string | null;
  issued_at: string | null;
  paid_at: string | null;
  due_on: string | null;
  patients: { first_name?: string; last_name?: string } | null;
};

const money = (n: number | null | undefined) =>
  (Number(n) || 0).toFixed(2);

const name = (p: InvoiceRow["patients"]) =>
  `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "—";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

/** Run a finance report over [from, to] (YYYY-MM-DD inclusive). */
export async function runReport(
  supabase: DB,
  key: ReportKey,
  from: string,
  to: string,
): Promise<ReportData> {
  const toEnd = `${to}T23:59:59.999Z`;
  const fromStart = `${from}T00:00:00.000Z`;

  if (key === "invoices") {
    const { data } = await supabase
      .from("invoices")
      .select("number, total, status, issued_at, paid_at, due_on, patients(first_name, last_name)")
      .gte("issued_at", fromStart)
      .lte("issued_at", toEnd)
      .order("issued_at", { ascending: false });
    const rows = (data ?? []) as unknown as InvoiceRow[];
    let total = 0;
    const out = rows.map((r) => {
      total += Number(r.total) || 0;
      return [r.number ?? "—", day(r.issued_at), name(r.patients), r.status ?? "—", money(r.total)];
    });
    return { title: "Invoices", columns: ["Number", "Issued", "Patient", "Status", "Total"], rows: out, total };
  }

  if (key === "transactions") {
    const { data } = await supabase
      .from("invoices")
      .select("number, total, paid_at, patients(first_name, last_name)")
      .eq("status", "paid")
      .gte("paid_at", fromStart)
      .lte("paid_at", toEnd)
      .order("paid_at", { ascending: true });
    const rows = (data ?? []) as unknown as InvoiceRow[];
    // group by paid day
    const byDay = new Map<string, { count: number; sum: number }>();
    for (const r of rows) {
      const d = day(r.paid_at);
      const cur = byDay.get(d) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += Number(r.total) || 0;
      byDay.set(d, cur);
    }
    let total = 0;
    const out = [...byDay.entries()].map(([d, v]) => {
      total += v.sum;
      return [d, v.count, money(v.sum)];
    });
    return { title: "Daily Transactions", columns: ["Day", "Payments", "Total received"], rows: out, total };
  }

  // receivables — unpaid invoices (money owed), not date-bound to issue range
  const { data } = await supabase
    .from("invoices")
    .select("number, total, status, issued_at, due_on, patients(first_name, last_name)")
    .in("status", ["sent", "draft"])
    .order("due_on", { ascending: true });
  const rows = (data ?? []) as unknown as InvoiceRow[];
  let total = 0;
  const out = rows.map((r) => {
    total += Number(r.total) || 0;
    return [r.number ?? "—", name(r.patients), r.status ?? "—", r.due_on ?? "—", money(r.total)];
  });
  return { title: "Accounts Receivable", columns: ["Number", "Patient", "Status", "Due", "Total"], rows: out, total };
}

/** Serialize a report to CSV (RFC-4180-ish: quote fields, double internal quotes). */
export function toCSV(data: ReportData): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [data.columns.map(esc).join(",")];
  for (const row of data.rows) lines.push(row.map(esc).join(","));
  if (data.total != null) {
    const n = data.columns.length;
    const cells = Array(n).fill("");
    cells[Math.max(0, n - 2)] = "Total";
    cells[n - 1] = data.total.toFixed(2);
    lines.push(cells.map(esc).join(","));
  }
  return lines.join("\r\n");
}
