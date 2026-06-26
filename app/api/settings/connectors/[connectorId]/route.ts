import { getCurrentPractitioner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ connectorId: string }> }) {
  const me = await getCurrentPractitioner();
  if (!me || !["doctor", "admin"].includes(me.role)) return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { connectorId } = await params;
  const body = await request.json().catch(() => ({})) as { enabled?: boolean; config_json?: Record<string, unknown> };
  const admin = createAdminClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.enabled !== undefined) update.enabled = body.enabled;
  if (body.config_json !== undefined) update.config_json = body.config_json;

  const { error } = await admin.from("practice_connectors").upsert({ connector_id: connectorId, ...update }, { onConflict: "connector_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
