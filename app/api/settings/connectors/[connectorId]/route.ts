import { requireStaffApi } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ connectorId: string }> }) {
  const gate = await requireStaffApi(["doctor", "admin"]);
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  const { connectorId } = await params;
  const body = await request.json().catch(() => ({})) as { enabled?: boolean; config_json?: Record<string, unknown> };
  const admin = createAdminClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.enabled !== undefined) update.enabled = body.enabled;
  if (body.config_json !== undefined) update.config_json = body.config_json;

  // Practice-scoped write — resolve the row by (practice_id, connector_id) so one tenant can't overwrite another's.
  const { data: existing } = await admin
    .from("practice_connectors")
    .select("id")
    .eq("practice_id", me.practice_id)
    .eq("connector_id", connectorId)
    .maybeSingle();
  const { error } = existing
    ? await admin.from("practice_connectors").update(update).eq("id", existing.id)
    : await admin.from("practice_connectors").insert({ practice_id: me.practice_id, connector_id: connectorId, ...update });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
