"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeTotals,
  money,
  servicePrice,
  PAYMENT_METHODS,
  type InvoiceItemKind,
  type PaymentMethod,
} from "@/lib/invoices/helpers";

type ServiceOption = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  first_visit_price: number | null;
  taxable: boolean;
};
type ProductOption = { id: string; name: string; price: number };

type Row = {
  key: string;
  kind: InvoiceItemKind;
  ref_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
};

let keySeq = 0;
const nextKey = () => `row-${keySeq++}`;

export default function InvoiceBuilder({
  patientId,
  services,
  products,
  taxRatePct,
  taxLabel,
  currency,
  hasPriorPaid,
}: {
  patientId: string;
  services: ServiceOption[];
  products: ProductOption[];
  taxRatePct: number;
  taxLabel: string;
  currency: string;
  hasPriorPaid: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [firstVisit, setFirstVisit] = useState(!hasPriorPaid);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const discountNum = useMemo(() => {
    const d = Number(discount);
    return Number.isFinite(d) && d > 0 ? d : 0;
  }, [discount]);

  const totals = useMemo(
    () => computeTotals(rows, taxRatePct, discountNum),
    [rows, taxRatePct, discountNum],
  );

  function addService(id: string) {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    setRows((rs) => [
      ...rs,
      {
        key: nextKey(),
        kind: "service",
        ref_id: svc.id,
        description: svc.name,
        qty: 1,
        unit_price: servicePrice(svc, firstVisit),
        taxable: svc.taxable,
      },
    ]);
  }

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setRows((rs) => [
      ...rs,
      {
        key: nextKey(),
        kind: "product",
        ref_id: p.id,
        description: p.name,
        qty: 1,
        unit_price: p.price,
        taxable: false,
      },
    ]);
  }

  function addCustom() {
    setRows((rs) => [
      ...rs,
      {
        key: nextKey(),
        kind: "custom",
        ref_id: null,
        description: "",
        qty: 1,
        unit_price: 0,
        taxable: false,
      },
    ]);
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function submit(mode: "draft" | "sent" | "paid") {
    setErr("");
    const items = rows
      .map((r) => ({
        kind: r.kind,
        ref_id: r.ref_id,
        description: r.description.trim(),
        qty: r.qty,
        unit_price: r.unit_price,
        taxable: r.taxable,
      }))
      .filter(
        (r) =>
          r.description &&
          Number.isFinite(r.qty) &&
          r.qty > 0 &&
          Number.isFinite(r.unit_price) &&
          r.unit_price >= 0,
      );

    if (items.length === 0) {
      setErr("Add at least one line item with a description and quantity.");
      return;
    }
    if (mode === "paid" && !paymentMethod) {
      setErr("Choose a payment method to mark this invoice paid.");
      return;
    }

    setBusy(true);

    // Always create as a draft first, then transition status if needed.
    const createRes = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        patientId,
        items,
        discount: discountNum,
        notes: notes.trim() || null,
        receiptRequired,
        dueOn: dueOn || null,
      }),
    });
    if (!createRes.ok) {
      const j = await createRes.json().catch(() => ({}));
      setErr(j.error || "Could not save invoice — please try again.");
      setBusy(false);
      return;
    }
    const { id } = (await createRes.json()) as { id: string };

    if (mode !== "draft") {
      const updateRes = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id,
          status: mode,
          paymentMethod: mode === "paid" ? paymentMethod : undefined,
        }),
      });
      if (!updateRes.ok) {
        const j = await updateRes.json().catch(() => ({}));
        setErr(j.error || "Saved as draft, but could not update status.");
        setBusy(false);
        router.refresh();
        return;
      }
    }

    // Reset and refresh history.
    setRows([]);
    setDiscount("");
    setPaymentMethod("");
    setReceiptRequired(false);
    setNotes("");
    setDueOn("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 className="serif" style={{ fontSize: 19, margin: 0 }}>
          New invoice
        </h2>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={firstVisit}
            onChange={(e) => setFirstVisit(e.target.checked)}
          />
          First visit pricing
        </label>
      </div>

      {/* Line items */}
      <div style={{ marginTop: 14 }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
            No line items yet — add a service, product, or custom line below.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <div
                key={r.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 64px 110px auto auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={r.description}
                  placeholder="Description"
                  onChange={(e) =>
                    patchRow(r.key, { description: e.target.value })
                  }
                  style={fieldStyle}
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={r.qty}
                  onChange={(e) =>
                    patchRow(r.key, { qty: Number(e.target.value) })
                  }
                  style={fieldStyle}
                  aria-label="Quantity"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={r.unit_price}
                  onChange={(e) =>
                    patchRow(r.key, { unit_price: Number(e.target.value) })
                  }
                  style={fieldStyle}
                  aria-label="Unit price"
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={r.taxable}
                    onChange={(e) =>
                      patchRow(r.key, { taxable: e.target.checked })
                    }
                  />
                  Tax
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  aria-label="Remove line"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--rust)",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "0 4px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add-row controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addService(e.target.value);
            e.target.value = "";
          }}
          style={{ ...fieldStyle, maxWidth: 240 }}
          aria-label="Add service"
        >
          <option value="">+ Add service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.first_visit_price != null && firstVisit
                ? ` (${money(s.first_visit_price, currency)})`
                : s.price != null
                  ? ` (${money(s.price, currency)})`
                  : ""}
            </option>
          ))}
        </select>

        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addProduct(e.target.value);
            e.target.value = "";
          }}
          style={{ ...fieldStyle, maxWidth: 220 }}
          aria-label="Add product"
        >
          <option value="">+ Add product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({money(p.price, currency)})
            </option>
          ))}
        </select>

        <button type="button" className="btn ghost" onClick={addCustom}>
          + Custom line
        </button>
      </div>

      {/* Totals */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 320,
          marginLeft: "auto",
        }}
      >
        <div style={totalRow}>
          <span className="muted">Subtotal</span>
          <span>{money(totals.subtotal, currency)}</span>
        </div>
        <div style={totalRow}>
          <label
            className="muted"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            Discount
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={discount}
              placeholder="0.00"
              onChange={(e) => setDiscount(e.target.value)}
              style={{ ...fieldStyle, width: 90, padding: "6px 8px" }}
            />
          </label>
          <span>−{money(discountNum, currency)}</span>
        </div>
        <div style={totalRow}>
          <span className="muted">
            {taxLabel} ({taxRatePct}%)
          </span>
          <span>{money(totals.taxAmount, currency)}</span>
        </div>
        <div style={{ ...totalRow, fontWeight: 700, fontSize: 16 }}>
          <span>Total</span>
          <span>{money(totals.total, currency)}</span>
        </div>
      </div>

      {/* Footer fields */}
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          Payment method
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod | "")
            }
            style={fieldStyle}
          >
            <option value="">— Not paid yet —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Due date
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional note shown on the invoice"
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>

        <label
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={receiptRequired}
            onChange={(e) => setReceiptRequired(e.target.checked)}
          />
          Receipt required
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div
        style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => submit("draft")}
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => submit("sent")}
        >
          Save &amp; mark sent
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || !paymentMethod}
          onClick={() => submit("paid")}
        >
          Save &amp; mark paid
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;

const fieldStyle = {
  padding: "10px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
} as const;

const totalRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 14,
} as const;
