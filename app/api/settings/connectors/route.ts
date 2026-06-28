import { getCurrentPractitioner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const me = await getCurrentPractitioner();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: registry } = await admin.from("connector_registry").select("*").order("phase").order("label");
  // Admin client bypasses RLS — without the practice filter this returns every tenant's connector config.
  const { data: enabled } = await admin.from("practice_connectors").select("connector_id, enabled, config_json").eq("practice_id", me.practice_id);

  const enabledMap = new Map((enabled ?? []).map((r) => [r.connector_id, r]));
  const connectors = (registry ?? []).map((c) => ({
    ...c,
    enabled: enabledMap.get(c.id)?.enabled ?? false,
    config_json: enabledMap.get(c.id)?.config_json ?? {},
  }));

  return NextResponse.json({ connectors });
}

export async function POST(request: Request) {
  const me = await getCurrentPractitioner();
  if (!me || !["doctor", "admin"].includes(me.role)) return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { connectorId } = await request.json().catch(() => ({})) as { connectorId?: string };
  if (!connectorId) return NextResponse.json({ error: "missing connectorId" }, { status: 400 });

  const admin = createAdminClient();
  // Practice-scoped write. A global connector_id upsert lets one tenant overwrite another's config, so
  // resolve the row by (practice_id, connector_id) explicitly — correct regardless of the table's unique index.
  const { data: existing } = await admin
    .from("practice_connectors")
    .select("id")
    .eq("practice_id", me.practice_id)
    .eq("connector_id", connectorId)
    .maybeSingle();
  const { error } = existing
    ? await admin.from("practice_connectors").update({ enabled: true }).eq("id", existing.id)
    : await admin.from("practice_connectors").insert({ practice_id: me.practice_id, connector_id: connectorId, enabled: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
