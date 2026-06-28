import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPractitioner } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { sendReminderEmail } from "@/lib/email/resend";
import { invoiceEmail } from "@/lib/email/templates";
import { NextResponse } from "next/server";
import {
  computeTotals,
  lineTotal,
  type InvoiceItemKind,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoices/helpers";

const VALID_KINDS: InvoiceItemKind[] = ["service", "product", "custom"];
const VALID_METHODS: PaymentMethod[] = ["cash", "bitcoin", "zelle", "stripe"];
const VALID_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "void"];

type CleanItem = {
  kind: InvoiceItemKind;
  ref_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
  sort_order: number;
};

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Normalise client-supplied line items. Prices/totals are recomputed server-side. */
function cleanItems(raw: unknown): CleanItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  const items: CleanItem[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const kind = String(r.kind ?? "custom") as InvoiceItemKind;
    const description = String(r.description ?? "").trim();
    const qty = Number(r.qty);
    const unit_price = Number(r.unit_price);
    if (!description) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(unit_price) || unit_price < 0) continue;
    const refRaw = r.ref_id != null ? String(r.ref_id).trim() : "";
    items.push({
      kind: VALID_KINDS.includes(kind) ? kind : "custom",
      ref_id: refRaw || null,
      description,
      qty: Math.round(qty * 100) / 100,
      unit_price: Math.round(unit_price * 100) / 100,
      taxable: Boolean(r.taxable),
      sort_order: items.length,
    });
  }
  return items;
}

function cleanDiscount(raw: unknown): number {
  const d = Number(raw);
  if (!Number.isFinite(d) || d < 0) return 0;
  return Math.round(d * 100) / 100;
}

export async function POST(request: Request) {
  // Staff only — patients cannot manage invoices.
  const practitioner = await getCurrentPractitioner();
  if (!practitioner)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");

  const supabase = await createClient();

  // Tax rate + currency are practice-wide settings — load once, trust nothing else.
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("tax_rate, currency")
    .limit(1)
    .maybeSingle();
  const taxRatePct = Number(settings?.tax_rate ?? 0) || 0;
  const currency = String(settings?.currency ?? "USD") || "USD";

  // -------------------------------------------------------------- create
  if (action === "create") {
    const patientId = String(body.patientId ?? "").trim();
    if (!patientId) return bad("missing patientId");

    const items = cleanItems(body.items);
    if (items.length === 0) return bad("invoice needs at least one line item");

    const discount = cleanDiscount(body.discount);
    const notes =
      body.notes != null && String(body.notes).trim() !== ""
        ? String(body.notes).trim()
        : null;
    const receiptRequired = Boolean(body.receiptRequired);
    const dueOn =
      body.dueOn != null && String(body.dueOn).trim() !== ""
        ? String(body.dueOn).trim()
        : null;

    const totals = computeTotals(items, taxRatePct, discount);

    // Short increasing-ish invoice number; unique enough for manual bookkeeping.
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId);
    const number = `INV-${1000 + (count ?? 0) + 1}`;

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        patient_id: patientId,
        practitioner_id: practitioner.id,
        number,
        status: "draft",
        subtotal: totals.subtotal,
        discount,
        tax_rate: taxRatePct,
        tax_amount: totals.taxAmount,
        total: totals.total,
        currency,
        receipt_required: receiptRequired,
        notes,
        due_on: dueOn,
      })
      .select("id")
      .maybeSingle();

    if (invErr || !inv)
      return bad(invErr?.message ?? "could not create invoice");

    const rows = items.map((it) => ({
      invoice_id: inv.id,
      kind: it.kind,
      ref_id: it.ref_id,
      description: it.description,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: lineTotal(it.qty, it.unit_price),
      taxable: it.taxable,
      sort_order: it.sort_order,
    }));
    const { error: itemErr } = await supabase.from("invoice_items").insert(rows);
    if (itemErr) {
      // Roll back the header so we never leave an empty invoice behind.
      await supabase.from("invoices").delete().eq("id", inv.id);
      return bad(itemErr.message);
    }

    await logAudit({
      action: "create",
      resource: "invoice",
      resourceId: inv.id,
      patientId,
    });

    return NextResponse.json({ id: inv.id });
  }

  // -------------------------------------------------------------- update
  if (action === "update") {
    const id = String(body.id ?? "").trim();
    if (!id) return bad("missing id");

    const { data: existing } = await supabase
      .from("invoices")
      .select("id, patient_id, practice_id, discount, issued_at, status, total, number, payment_method, receipt_issued")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return bad("invoice not found");

    const patch: Record<string, unknown> = {};

    if (body.notes !== undefined)
      patch.notes =
        body.notes != null && String(body.notes).trim() !== ""
          ? String(body.notes).trim()
          : null;
    if (body.receiptIssued !== undefined)
      patch.receipt_issued = Boolean(body.receiptIssued);
    if (body.dueOn !== undefined)
      patch.due_on =
        body.dueOn != null && String(body.dueOn).trim() !== ""
          ? String(body.dueOn).trim()
          : null;

    // Discount may change independently or alongside items; both affect totals.
    const discount =
      body.discount !== undefined
        ? cleanDiscount(body.discount)
        : Number(existing.discount ?? 0);

    // Replace line items if provided: delete existing then reinsert.
    const itemsProvided = body.items !== undefined;
    let items: CleanItem[] = [];
    if (itemsProvided) {
      items = cleanItems(body.items);
      if (items.length === 0)
        return bad("invoice needs at least one line item");
    }

    // Recompute totals whenever items and/or discount change.
    if (itemsProvided || body.discount !== undefined) {
      let basis = items;
      if (!itemsProvided) {
        const { data: cur } = await supabase
          .from("invoice_items")
          .select("qty, unit_price, taxable")
          .eq("invoice_id", id);
        basis = (cur ?? []).map((c, i) => ({
          kind: "custom" as InvoiceItemKind,
          ref_id: null,
          description: "",
          qty: Number(c.qty),
          unit_price: Number(c.unit_price),
          taxable: Boolean(c.taxable),
          sort_order: i,
        }));
      }
      const totals = computeTotals(basis, taxRatePct, discount);
      patch.discount = discount;
      patch.subtotal = totals.subtotal;
      patch.tax_rate = taxRatePct;
      patch.tax_amount = totals.taxAmount;
      patch.total = totals.total;
    }

    // Status transitions.
    if (body.status !== undefined) {
      const status = String(body.status) as InvoiceStatus;
      if (!VALID_STATUSES.includes(status)) return bad("invalid status");
      patch.status = status;
      if (status === "sent" && !existing.issued_at)
        patch.issued_at = new Date().toISOString();
      if (status === "paid") {
        const method = String(body.paymentMethod ?? "");
        if (!VALID_METHODS.includes(method as PaymentMethod))
          return bad("payment method required to mark paid");
        patch.payment_method = method;
        patch.paid_at = new Date().toISOString();
        if (!existing.issued_at) patch.issued_at = new Date().toISOString();
      }
    } else if (body.paymentMethod !== undefined) {
      const method = String(body.paymentMethod ?? "");
      if (method && !VALID_METHODS.includes(method as PaymentMethod))
        return bad("invalid payment method");
      patch.payment_method = method || null;
    }

    if (itemsProvided) {
      await supabase.from("invoice_items").delete().eq("invoice_id", id);
      const rows = items.map((it) => ({
        invoice_id: id,
        kind: it.kind,
        ref_id: it.ref_id,
        description: it.description,
        qty: it.qty,
        unit_price: it.unit_price,
        line_total: lineTotal(it.qty, it.unit_price),
        taxable: it.taxable,
        sort_order: it.sort_order,
      }));
      const { error: itemErr } = await supabase
        .from("invoice_items")
        .insert(rows);
      if (itemErr) return bad(itemErr.message);
    }

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", id);
      if (upErr) return bad(upErr.message);
    }

    // Keep the payments ledger in sync so paid invoices count toward revenue/analytics.
    // The invoice number is the idempotency key (one payment per invoice).
    const finalStatus = (patch.status as InvoiceStatus | undefined) ?? (existing.status as InvoiceStatus);
    const ledgerRef = (existing.number as string | null) || `INV:${id}`;
    if (finalStatus === "paid") {
      const total = (patch.total as number | undefined) ?? Number(existing.total ?? 0);
      const method = (patch.payment_method as string | undefined) ?? (existing.payment_method as string | null) ?? "cash";
      const signed = Boolean(patch.receipt_issued ?? existing.receipt_issued);
      const paidAt = (patch.paid_at as string | undefined) ?? new Date().toISOString();
      const { data: dup } = await supabase
        .from("payments")
        .select("id")
        .eq("patient_id", existing.patient_id)
        .eq("receipt_ref", ledgerRef)
        .maybeSingle();
      if (dup) {
        await supabase.from("payments").update({ amount: total, method, signed_receipt: signed }).eq("id", dup.id);
      } else if (total > 0) {
        await supabase.from("payments").insert({
          patient_id: existing.patient_id,
          amount: total,
          method,
          receipt_ref: ledgerRef,
          signed_receipt: signed,
          created_at: paidAt,
        });
      }
    } else if (finalStatus === "void") {
      // A voided invoice must not count as revenue — remove any linked payment.
      await supabase.from("payments").delete().eq("patient_id", existing.patient_id).eq("receipt_ref", ledgerRef);
    }

    // Notify the patient when an invoice is first issued. NO PHI — just a portal link. Best-effort.
    if (finalStatus === "sent" && existing.status !== "sent") {
      try {
        const admin = createAdminClient();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const [{ data: pt }, { data: ps }] = await Promise.all([
          admin.from("patients").select("email").eq("id", existing.patient_id).maybeSingle(),
          // Scope to THIS invoice's practice — an unscoped row would email the wrong clinic name.
          admin.from("practice_settings").select("name, legal_name").eq("practice_id", existing.practice_id).maybeSingle(),
        ]);
        if (pt?.email && appUrl) {
          const { subject, text } = invoiceEmail({
            practiceName: ps?.legal_name || ps?.name || "your clinic",
            appUrl,
          });
          try {
            const r = await sendReminderEmail(pt.email, subject, text);
            await admin.from("email_log").insert({
              patient_id: existing.patient_id,
              template: "invoice_sent",
              resend_id: r.id,
              status: r.skipped ? "skipped" : "sent",
            });
          } catch {
            // log the attempt even when the provider rejects (e.g. unverified sender / test mode)
            await admin.from("email_log").insert({
              patient_id: existing.patient_id,
              template: "invoice_sent",
              status: "error",
            });
          }
        }
      } catch {
        // best-effort — a failed notification never blocks the status change
      }
    }

    await logAudit({
      action: "update",
      resource: "invoice",
      resourceId: id,
      patientId: existing.patient_id,
    });

    return NextResponse.json({ ok: true });
  }

  // -------------------------------------------------------------- delete
  if (action === "delete") {
    const id = String(body.id ?? "").trim();
    if (!id) return bad("missing id");

    const { data: existing } = await supabase
      .from("invoices")
      .select("id, patient_id, number")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return bad("invoice not found");

    // Remove any linked ledger payment so a deleted invoice never leaves orphaned revenue.
    const ledgerRef = (existing.number as string | null) || `INV:${id}`;
    await supabase.from("payments").delete().eq("patient_id", existing.patient_id).eq("receipt_ref", ledgerRef);

    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return bad(error.message);

    await logAudit({
      action: "delete",
      resource: "invoice",
      resourceId: id,
      patientId: existing.patient_id,
    });

    return NextResponse.json({ ok: true });
  }

  return bad("unknown action");
}
