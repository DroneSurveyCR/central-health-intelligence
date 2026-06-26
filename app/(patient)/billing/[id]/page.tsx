import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import { money, STATUS_META, type Invoice, type InvoiceItem } from "@/lib/invoices/helpers";
import PrintButton from "./PrintButton";
import PayButton from "../PayButton";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bitcoin: "Bitcoin",
  zelle: "Zelle",
  stripe: "Card / Stripe",
};

function fmt(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default async function InvoiceReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  // RLS scopes invoices/items to the signed-in patient — a foreign id resolves to null.
  const { data: invRaw } = (await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as unknown as { data: Invoice | null };
  if (!invRaw) redirect("/billing");
  const inv = invRaw;

  const [{ data: itemRows }, { data: ps }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: InvoiceItem[] | null }>,
    supabase
      .from("practice_settings")
      .select("name, legal_name, tax_label, invoice_footer, contact_json")
      .limit(1)
      .maybeSingle() as unknown as Promise<{
      data: { name: string | null; legal_name: string | null; tax_label: string | null; invoice_footer: string | null; contact_json: Record<string, unknown> | null } | null;
    }>,
  ]);
  const items = itemRows ?? [];
  const cur = inv.currency ?? "USD";
  const meta = STATUS_META[inv.status];
  const isPaid = inv.status === "paid";
  const practiceName = ps?.legal_name || ps?.name || "Casa Elev8";
  const contact = (ps?.contact_json ?? {}) as Record<string, string>;
  const taxName = ps?.tax_label || "Tax";
  const docLabel = isPaid ? t("billing_receipt_doc", lang) : t("billing_invoice_doc", lang);
  const patientName = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || (me.email ?? "");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Link href="/billing" className="muted">← {t("billing_title", lang)}</Link>
        <PrintButton label={t("billing_print", lang)} />
      </div>

      <div className="card receipt" style={{ maxWidth: "none", padding: 28 }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="serif" style={{ fontSize: 22 }}>{practiceName}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              {[contact.city, contact.country].filter(Boolean).join(", ")}
              {contact.email ? ` · ${contact.email}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="serif" style={{ fontSize: 20 }}>{docLabel}</div>
            {inv.number && <div className="muted" style={{ fontSize: 13 }}>{inv.number}</div>}
            <span style={{ display: "inline-block", marginTop: 6, padding: "3px 11px", borderRadius: 999, background: meta.bg, color: meta.fg, fontSize: 12.5, fontWeight: 600 }}>{meta.label}</span>
          </div>
        </div>

        {/* meta */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginTop: 20, fontSize: 13.5 }}>
          <div>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{t("billing_bill_to", lang)}</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{patientName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{t("billing_invoice_no", lang)}</div>
            <div style={{ marginTop: 2 }}>{fmt(inv.issued_at || inv.created_at, locale)}</div>
          </div>
        </div>

        {/* line items */}
        <div style={{ marginTop: 22, borderTop: "1px solid var(--line)" }}>
          {items.map((it, i) => (
            <div key={it.id ?? i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
              <div>
                <div>{it.description}</div>
                {Number(it.qty) !== 1 && (
                  <div className="muted" style={{ fontSize: 12.5 }}>{t("billing_qty", lang)} {Number(it.qty)} × {money(Number(it.unit_price), cur)}</div>
                )}
              </div>
              <div style={{ whiteSpace: "nowrap" }}>{money(Number(it.line_total), cur)}</div>
            </div>
          ))}
        </div>

        {/* totals */}
        <div style={{ marginTop: 14, marginLeft: "auto", maxWidth: 280, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
          <Row label={t("billing_subtotal", lang)} value={money(Number(inv.subtotal ?? 0), cur)} />
          {Number(inv.discount ?? 0) > 0 && <Row label={t("billing_discount", lang)} value={`− ${money(Number(inv.discount), cur)}`} />}
          {Number(inv.tax_amount ?? 0) > 0 && <Row label={`${taxName} (${Number(inv.tax_rate)}%)`} value={money(Number(inv.tax_amount), cur)} />}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 17, borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 2 }}>
            <span>{t("billing_total", lang)}</span>
            <span>{money(Number(inv.total ?? 0), cur)}</span>
          </div>
        </div>

        {/* payment status */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 13.5 }}>
          {isPaid ? (
            <div style={{ color: "var(--berry)", fontWeight: 600 }}>
              ✓ {t("billing_paid_with", lang)} {inv.payment_method ? (METHOD_LABELS[inv.payment_method] ?? inv.payment_method) : ""}
              {inv.paid_at ? ` · ${fmt(inv.paid_at, locale)}` : ""}
            </div>
          ) : inv.status === "sent" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <div style={{ color: "var(--rust)", fontWeight: 600 }}>{t("billing_amount_due", lang)}: {money(Number(inv.total ?? 0), cur)}</div>
              <PayButton invoiceId={inv.id} label={`${t("billing_pay", lang)} · ${money(Number(inv.total ?? 0), cur)}`} />
            </div>
          ) : null}
          {inv.notes && <p className="muted" style={{ marginTop: 8 }}>{inv.notes}</p>}
          <p className="muted" style={{ marginTop: 10 }}>{ps?.invoice_footer || t("billing_thanks", lang)}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
