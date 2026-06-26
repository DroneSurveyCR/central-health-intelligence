import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import InsuranceManager, { type InsuranceRecord } from "./InsuranceManager";

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return <p className="muted">Patient not found, or you don&apos;t have access.</p>;

  await logAudit({ action: "view", resource: "patient_insurance", resourceId: null, patientId });

  const { data: records } = await supabase
    .from("patient_insurance")
    .select("id, insurer, policy_number, group_number, subscriber_name, effective_date, notes")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  return (
    <div style={{ maxWidth: 680 }}>
      <Link href={`/patients/${patient.id}`} className="muted" style={{ fontSize: 13, textDecoration: "none" }}>
        ← {patient.first_name} {patient.last_name}
      </Link>
      <h1 className="serif" style={{ fontSize: 26, margin: "8px 0 16px" }}>Insurance</h1>
      <InsuranceManager patientId={patient.id} initial={(records ?? []) as InsuranceRecord[]} />
    </div>
  );
}
