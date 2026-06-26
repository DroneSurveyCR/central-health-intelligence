// Shared invoicing types + money/tax math. Manual bookkeeping (no Stripe).
// Tax is a whole-percent practice setting; discount applies to subtotal pre-tax.

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceItemKind = "service" | "product" | "custom";
export type PaymentMethod = "cash" | "bitcoin" | "zelle" | "stripe";

export type InvoiceItem = {
  id?: string;
  invoice_id?: string;
  kind: InvoiceItemKind;
  ref_id?: string | null;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  taxable: boolean;
  sort_order?: number;
};

export type Invoice = {
  id: string;
  patient_id: string;
  practitioner_id: string | null;
  appointment_id: string | null;
  number: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  payment_method: PaymentMethod | null;
  receipt_required: boolean;
  receipt_issued: boolean;
  notes: string | null;
  issued_at: string | null;
  due_on: string | null;
  paid_at: string | null;
  created_at: string;
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "zelle", label: "Zelle" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "stripe", label: "Card / Stripe" },
];

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", CRC: "₡", EUR: "€", GBP: "£" };

export function money(n: number, currency = "USD"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "";
  const v = (Number.isFinite(n) ? n : 0).toFixed(2);
  return sym ? `${sym}${v}` : `${v} ${currency}`;
}

export function lineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

/** Totals from line items: discount comes off subtotal pre-tax; tax only on taxable lines. */
export function computeTotals(
  items: Pick<InvoiceItem, "qty" | "unit_price" | "taxable">[],
  taxRatePct: number,
  discount = 0,
): { subtotal: number; taxableBase: number; taxAmount: number; total: number } {
  const subtotal = round2(items.reduce((s, it) => s + lineTotal(it.qty, it.unit_price), 0));
  const disc = Math.min(Math.max(0, discount), subtotal);
  const discountFactor = subtotal > 0 ? (subtotal - disc) / subtotal : 1;
  const taxableBase = round2(
    items.filter((it) => it.taxable).reduce((s, it) => s + lineTotal(it.qty, it.unit_price), 0) * discountFactor,
  );
  const taxAmount = round2((taxableBase * (taxRatePct || 0)) / 100);
  const total = round2(subtotal - disc + taxAmount);
  return { subtotal, taxableBase, taxAmount, total };
}

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** First-visit tiered pricing: use first_visit_price when it's the patient's first of that service. */
export function servicePrice(
  svc: { price: number | null; first_visit_price: number | null },
  isFirstVisit: boolean,
): number {
  if (isFirstVisit && svc.first_visit_price != null) return svc.first_visit_price;
  return svc.price ?? 0;
}

export const STATUS_META: Record<InvoiceStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: "rgba(123,138,126,0.15)", fg: "#5d6b60" },
  sent: { label: "Sent", bg: "rgba(244,166,60,0.18)", fg: "#9a6a16" },
  paid: { label: "Paid", bg: "rgba(20,131,78,0.15)", fg: "#14834e" },
  void: { label: "Void", bg: "rgba(224,97,59,0.15)", fg: "#b8431f" },
};
