import { requireStaff } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import ConnectorGrid from "./ConnectorGrid";

export default async function ConnectorsPage() {
  await requireStaff();
  const admin = createAdminClient();

  const [{ data: registry }, { data: enabled }] = await Promise.all([
    admin.from("connector_registry").select("*").order("phase").order("label"),
    admin.from("practice_connectors").select("connector_id, enabled, config_json"),
  ]);

  const enabledMap = new Map((enabled ?? []).map((r) => [r.connector_id, r]));
  const connectors = (registry ?? []).map((c) => ({
    ...c,
    enabled: enabledMap.get(c.id)?.enabled ?? false,
    config_json: enabledMap.get(c.id)?.config_json ?? {},
  }));

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Data Source Connectors</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Enable or disable data sources for this practice. MVP connectors are active by default. Phase 2 connectors are coming soon.</p>
      <ConnectorGrid connectors={connectors} />
    </div>
  );
}
