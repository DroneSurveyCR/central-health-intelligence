import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import {
  money,
  STATUS_META,
  PAYMENT_METHODS,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
} from "@/lib/invoices/helpers";
import InvoiceBuilder from "./InvoiceBuilder";

type InvoiceRow = Invoice & { invoice_items: InvoiceItem[] };

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  first_visit_price: number | null;
  taxable: boolean | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | null;
};

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
);

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusChip({ status }: { status: InvoiceStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span
      style={{
        background: meta.bg,
        color: meta.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      {meta.label}
    </span>
  );
}

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return (
      <p className="muted">Patient not found, or you don&apos;t have access.</p>
    );

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "invoices",
    resourceId: patientId,
    patientId,
  });

  const { data: settings } = await supabase
    .from("practice_settings")
    .select("tax_rate, tax_label, currency")
    .limit(1)
    .maybeSingle();
  const taxRatePct = Number(settings?.tax_rate ?? 0) || 0;
  const taxLabel = String(settings?.tax_label ?? "Tax") || "Tax";
  const currency = String(settings?.currency ?? "USD") || "USD";

  const { data: invoiceRows } = (await supabase
    .from("invoices")
    .select(
      "id, patient_id, practitioner_id, appointment_id, number, status, subtotal, discount, tax_rate, tax_amount, total, currency, payment_method, receipt_required, receipt_issued, notes, issued_at, due_on, paid_at, created_at, invoice_items(id, kind, ref_id, description, qty, unit_price, line_total, taxable, sort_order)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })) as {
    data: InvoiceRow[] | null;
  };

  const invoices = invoiceRows ?? [];
  // First-visit pricing default: true when the patient has no prior paid invoice.
  const hasPriorPaid = invoices.some((i) => i.status === "paid");

  const { data: serviceRows } = (await supabase
    .from("services")
    .select("id, name, category, price, first_visit_price, taxable")
    .eq("active", true)
    .order("sort_order")) as { data: ServiceRow[] | null };

  const { data: productRows } = (await supabase
    .from("products")
    .select("id, name, price")
    .order("name")) as { data: ProductRow[] | null };

  const services = (serviceRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    price: s.price,
    first_visit_price: s.first_visit_price,
    taxable: Boolean(s.taxable),
  }));
  const products = (productRows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price ?? 0),
  }));

  return (
    <div style={{ maxWidth: 820 }}>
      <Link
        href={`/patients/${patientId}`}
        className="muted"
        style={{ fontSize: 13, textDecoration: "none" }}
      >
        ← Back to patient
      </Link>
      <h1 className="serif" style={{ fontSize: 28, margin: "6px 0 0" }}>
        {patient.first_name} {patient.last_name}
      </h1>
      <p className="muted">Invoices &amp; billing</p>

      <InvoiceBuilder
        patientId={patientId}
        services={services}
        products={products}
        taxRatePct={taxRatePct}
        taxLabel={taxLabel}
        currency={currency}
        hasPriorPaid={hasPriorPaid}
      />

      <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
        History
      </h2>

      {invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {invoices.map((inv) => {
            const items = [...(inv.invoice_items ?? [])].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
            );
            return (
              <details key={inv.id} className="card">
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    cursor: "pointer",
                    listStyle: "none",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {inv.number ?? "Invoice"}
                    </span>
                    <StatusChip status={inv.status} />
                    <span className="muted" style={{ fontSize: 13 }}>
                      {formatDate(inv.created_at)}
                    </span>
                    {inv.payment_method && (
                      <span className="muted" style={{ fontSize: 13 }}>
                        · {METHOD_LABEL[inv.payment_method] ?? inv.payment_method}
                      </span>
                    )}
                    {inv.receipt_required && (
                      <span
                        style={{
                          fontSize: 12,
                          color: inv.receipt_issued
                            ? "var(--berry)"
                            : "var(--gold)",
                        }}
                      >
                        {inv.receipt_issued
                          ? "Receipt issued"
                          : "Receipt pending"}
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {money(Number(inv.total ?? 0), inv.currency || currency)}
                  </span>
                </summary>

                <div
                  style={{
                    marginTop: 12,
                    borderTop: "1px solid var(--line)",
                    paddingTop: 12,
                  }}
                >
                  {items.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                      No line items.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id ?? it.description}>
                            <td
                              style={{
                                padding: "4px 0",
                                fontSize: 14,
                                color: "var(--ink, #2c332d)",
                              }}
                            >
                              {it.description}
                            </td>
                            <td
                              className="muted"
                              style={{
                                padding: "4px 8px",
                                fontSize: 13,
                                textAlign: "right",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {it.qty} ×{" "}
                              {money(
                                Number(it.unit_price ?? 0),
                                inv.currency || currency,
                              )}
                            </td>
                            <td
                              style={{
                                padding: "4px 0",
                                fontSize: 14,
                                textAlign: "right",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {money(
                                Number(it.line_total ?? 0),
                                inv.currency || currency,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      fontSize: 13,
                    }}
                  >
                    <Row
                      label="Subtotal"
                      value={money(
                        Number(inv.subtotal ?? 0),
                        inv.currency || currency,
                      )}
                    />
                    {Number(inv.discount ?? 0) > 0 && (
                      <Row
                        label="Discount"
                        value={`−${money(Number(inv.discount ?? 0), inv.currency || currency)}`}
                      />
                    )}
                    <Row
                      label={`${taxLabel} (${Number(inv.tax_rate ?? 0)}%)`}
                      value={money(
                        Number(inv.tax_amount ?? 0),
                        inv.currency || currency,
                      )}
                    />
                    <Row
                      label="Total"
                      value={money(
                        Number(inv.total ?? 0),
                        inv.currency || currency,
                      )}
                      strong
                    />
                  </div>

                  {inv.notes && (
                    <p
                      className="muted"
                      style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}
                    >
                      {inv.notes}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span className={strong ? undefined : "muted"}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}
