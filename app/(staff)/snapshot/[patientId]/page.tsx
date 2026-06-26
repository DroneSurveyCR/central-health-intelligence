import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import Snapshot from "@/components/Snapshot";

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return <p className="muted">Patient not found, or you don&apos;t have access.</p>;
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({
    action: "view",
    resource: "snapshot",
    resourceId: patientId,
    patientId,
  });

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 16 }}>
        {patient.first_name} {patient.last_name}
      </h1>
      <Snapshot patientId={patientId} />
    </div>
  );
}
