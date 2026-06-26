import Link from "next/link";
import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import PayButton from "./PayButton";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";
import {
  money,
  STATUS_META,
  type Invoice,
  type InvoiceItem,
} from "@/lib/invoices/helpers";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bitcoin: "Bitcoin",
  zelle: "Zelle",
  stripe: "Stripe",
};

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "es" ? "es-CR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type PaymentRow = {
  id: string;
  amount: number | null;
  method: string | null;
  receipt_ref: string | null;
  created_at: string | null;
};

export default async function BillingPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();

  // RLS scopes all three queries to the signed-in patient.
  const [{ data: invoiceRows }, { data: itemRows }, { data: paymentRows }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false }) as unknown as Promise<{
        data: Invoice[] | null;
      }>,
      supabase
        .from("invoice_items")
        .select("*")
        .order("sort_order", { ascending: true }) as unknown as Promise<{
        data: (InvoiceItem & { invoice_id: string })[] | null;
      }>,
      supabase
        .from("payments")
        .select("id, amount, method, receipt_ref, created_at")
        .order("created_at", { ascending: false }) as unknown as Promise<{
        data: PaymentRow[] | null;
      }>,
    ]);

  const invoices = invoiceRows ?? [];
  const items = itemRows ?? [];
  const payments = paymentRows ?? [];

  const itemsByInvoice = new Map<string, (InvoiceItem & { invoice_id: string })[]>();
  for (const it of items) {
    const arr = itemsByInvoice.get(it.invoice_id) ?? [];
    arr.push(it);
    itemsByInvoice.set(it.invoice_id, arr);
  }

  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  const hasInvoices = invoices.length > 0;
  const currency = invoices[0]?.currency ?? "USD";

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>
        {t("billing_title", lang)}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        {t("billing_subtitle", lang)}
      </p>

      {/* Summary: outstanding + paid */}
      {hasInvoices && (
        <div
          className="card"
          style={{
            marginTop: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 150 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              {t("billing_outstanding", lang)}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 24,
                color: outstanding > 0 ? "var(--rust)" : "var(--ink)",
              }}
            >
              {money(outstanding, currency)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              {t("billing_total_paid", lang)}
            </div>
            <div className="serif" style={{ fontSize: 24, color: "var(--berry)" }}>
              {money(totalPaid, currency)}
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      <section style={{ marginTop: 26 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 10px" }}>
          {t("billing_invoices", lang)}
        </h2>
        {!hasInvoices ? (
          <div className="card">
            <p style={{ margin: 0 }}>{t("billing_no_invoices", lang)}</p>
          </div>
        ) : (
          invoices.map((inv) => {
            const meta = STATUS_META[inv.status];
            const cur = inv.currency ?? "USD";
            const lineItems = itemsByInvoice.get(inv.id) ?? [];
            const isUnpaid = inv.status === "sent";
            const isPaid = inv.status === "paid";
            return (
              <div key={inv.id} className="card" style={{ marginBottom: 12 }}>
                {/* header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {inv.number
                        ? `${t("billing_invoice_no", lang)} ${inv.number}`
                        : t("billing_invoice_no", lang)}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {formatDate(inv.created_at, lang)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={chip(meta.bg, meta.fg)}>{meta.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {money(Number(inv.total ?? 0), cur)}
                    </span>
                  </div>
                </div>

                {/* line items */}
                {lineItems.length > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      borderTop: "1px solid var(--line)",
                      paddingTop: 12,
                    }}
                  >
                    {lineItems.map((it, idx) => (
                      <div
                        key={it.id ?? idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "5px 0",
                          fontSize: 14,
                        }}
                      >
                        <div>
                          <div>{it.description}</div>
                          {Number(it.qty) !== 1 && (
                            <div className="muted" style={{ fontSize: 12.5 }}>
                              {t("billing_qty", lang)} {Number(it.qty)} ×{" "}
                              {money(Number(it.unit_price), cur)}
                            </div>
                          )}
                        </div>
                        <div style={{ whiteSpace: "nowrap" }}>
                          {money(Number(it.line_total), cur)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* totals */}
                <div
                  style={{
                    marginTop: 12,
                    borderTop: "1px solid var(--line)",
                    paddingTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    fontSize: 14,
                  }}
                >
                  <TotalRow
                    label={t("billing_subtotal", lang)}
                    value={money(Number(inv.subtotal ?? 0), cur)}
                  />
                  {Number(inv.discount ?? 0) > 0 && (
                    <TotalRow
                      label={t("billing_discount", lang)}
                      value={`− ${money(Number(inv.discount), cur)}`}
                    />
                  )}
                  {Number(inv.tax_amount ?? 0) > 0 && (
                    <TotalRow
                      label={`${taxLabel(inv)} (${Number(inv.tax_rate)}%)`}
                      value={money(Number(inv.tax_amount), cur)}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    <span>{t("billing_total", lang)}</span>
                    <span>{money(Number(inv.total ?? 0), cur)}</span>
                  </div>
                </div>

                {/* unpaid emphasis / paid details */}
                {isUnpaid && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 11,
                      background: "rgba(224,97,59,0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ color: "var(--rust)", fontWeight: 600 }}>
                      {t("billing_amount_due", lang)}
                    </span>
                    <span
                      className="serif"
                      style={{ fontSize: 20, color: "var(--rust)" }}
                    >
                      {money(Number(inv.total ?? 0), cur)}
                    </span>
                  </div>
                )}
                {isUnpaid && (
                  <div style={{ marginTop: 10 }}>
                    <PayButton
                      invoiceId={inv.id}
                      label={`${t("billing_pay", lang)} · ${money(Number(inv.total ?? 0), cur)}`}
                    />
                  </div>
                )}
                {isPaid && (
                  <div
                    className="muted"
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {inv.payment_method && (
                      <span>
                        {t("billing_paid_with", lang)}:{" "}
                        {METHOD_LABELS[inv.payment_method] ?? inv.payment_method}
                      </span>
                    )}
                    {inv.receipt_issued && (
                      <span>✓ {t("billing_receipt_issued", lang)}</span>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 12, textAlign: "right" }}>
                  <Link href={`/billing/${inv.id}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--berry)" }}>
                    {t("billing_view", lang)} →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Payments (preserved standalone list) */}
      {payments.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <h2 className="serif" style={{ fontSize: 19, margin: "0 0 10px" }}>
            {t("billing_payments", lang)}
          </h2>
          {payments.map((p) => {
            const method = p.method ?? "";
            const methodLabel = METHOD_LABELS[method] ?? method;
            return (
              <div key={p.id} className="card" style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {formatDate(p.created_at ?? "", lang)}
                    </div>
                    {p.receipt_ref && (
                      <div className="muted" style={{ fontSize: 13 }}>
                        {t("billing_receipt", lang)}: {p.receipt_ref}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {methodLabel && <span className="badge">{methodLabel}</span>}
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {money(Number(p.amount ?? 0), currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

// Invoices snapshot tax_rate but not tax_label; fall back to a generic label.
function taxLabel(inv: Invoice): string {
  void inv;
  return "Tax";
}

function chip(bg: string, fg: string) {
  return {
    display: "inline-block",
    padding: "3px 11px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontSize: 12.5,
    fontWeight: 600,
  } as const;
}
