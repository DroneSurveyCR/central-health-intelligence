import { createClient } from "@/lib/supabase/server";
import { getCurrentPatient } from "@/lib/auth/roles";
import { logAudit } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

type ProductRow = {
  id: string;
  name: string;
  price: number | null;
};

type OrderItem = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
};

export async function POST(request: Request) {
  const patient = await getCurrentPatient();
  if (!patient)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Expecting { items: [{ product_id, qty }] }.
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0)
    return NextResponse.json({ error: "cart is empty" }, { status: 400 });

  // Normalise + dedupe by product_id, summing quantities. Never trust prices.
  const wantQty = new Map<string, number>();
  for (const it of rawItems) {
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const productId = String(r.product_id ?? "").trim();
    const qty = Math.floor(Number(r.qty));
    if (!productId || !Number.isFinite(qty) || qty <= 0) continue;
    wantQty.set(productId, (wantQty.get(productId) ?? 0) + Math.min(qty, 99));
  }

  const productIds = [...wantQty.keys()];
  if (productIds.length === 0)
    return NextResponse.json({ error: "no valid items" }, { status: 400 });

  const supabase = await createClient();

  // Server-side price lookup — products are PUBLIC read.
  const { data: products, error: prodErr } = (await supabase
    .from("products")
    .select("id, name, price")
    .in("id", productIds)) as { data: ProductRow[] | null; error: { message: string } | null };

  if (prodErr)
    return NextResponse.json({ error: prodErr.message }, { status: 400 });

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  const items: OrderItem[] = [];
  let total = 0;
  for (const [productId, qty] of wantQty) {
    const product = byId.get(productId);
    if (!product) continue; // unknown product — silently drop
    const price = Number(product.price ?? 0);
    items.push({ product_id: product.id, name: product.name, price, qty });
    total += price * qty;
  }

  if (items.length === 0)
    return NextResponse.json({ error: "no valid items" }, { status: 400 });

  total = Math.round(total * 100) / 100;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      patient_id: patient.id,
      status: "pending",
      total,
      items_json: items,
      placed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    action: "create",
    resource: "orders",
    resourceId: data?.id ?? null,
    patientId: patient.id,
  });

  return NextResponse.json({ ok: true, id: data?.id });
}
