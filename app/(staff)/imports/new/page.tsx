import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ImportWizard from "./ImportWizard";

export default async function NewImportPage() {
  await requireStaff();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: patients }, { data: connectors }] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").is("deleted_at", null).order("last_name").limit(200),
    admin.from("connector_registry").select("id, label, accepts, target_table, phase, description").order("phase").order("label"),
  ]);

  const { data: enabledRows } = await admin.from("practice_connectors").select("connector_id, enabled");
  const enabledSet = new Set((enabledRows ?? []).filter((r) => r.enabled).map((r) => r.connector_id));

  const mvpConnectors = (connectors ?? []).filter((c) => c.phase === "mvp" && enabledSet.has(c.id));

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="serif" style={{ fontSize: 28 }}>Import patient data</h1>
      <ImportWizard patients={patients ?? []} connectors={mvpConnectors} />
    </div>
  );
}
