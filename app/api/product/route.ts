import { createClient } from "@/lib/supabase/server";
import { requireStaffApi } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

// Admin-only roles for managing the product catalog.
const ADMIN_ROLES = ["doctor", "admin"];

export async function POST(request: Request) {
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;
  if (!ADMIN_ROLES.includes(String(me.role)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const id = body.id ? String(body.id).trim() : null;
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "").trim() || "supplement";
  const priceNum = Number(body.price);

  if (!name)
    return NextResponse.json({ error: "missing name" }, { status: 400 });
  if (!Number.isFinite(priceNum) || priceNum < 0)
    return NextResponse.json({ error: "invalid price" }, { status: 400 });

  const price = Math.round(priceNum * 100) / 100;
  const fullscript_ref = body.fullscript_ref
    ? String(body.fullscript_ref).slice(0, 200)
    : null;

  const row: Record<string, unknown> = {
    name: name.slice(0, 200),
    type: type.slice(0, 50),
    price,
    fullscript_ref,
    updated_at: new Date().toISOString(),
  };
  if (id) row.id = id;

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .upsert(row, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
