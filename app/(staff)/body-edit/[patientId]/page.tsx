import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import type { BmPart, BmCross } from "@/lib/bodymap/schema";
import BodymapEditor from "./BodymapEditor";

export default async function BodyEditPage({
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
  if (!patient) return <p className="muted">Client not found.</p>;

  const { data: scan } = await supabase
    .from("scans")
    .select("scan_date, bodymap")
    .eq("patient_id", patientId)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const bodymap = (scan?.bodymap ?? null) as
    | { parts?: Record<string, BmPart>; cross?: BmCross[] }
    | null;
  const initialParts = bodymap?.parts;
  const initialCross = Array.isArray(bodymap?.cross) ? bodymap?.cross : undefined;

  await logAudit({
    action: "view",
    resource: "bodymap_editor",
    resourceId: patientId,
    patientId,
  });

  const name = `${patient.first_name} ${patient.last_name}`;

  return (
    <div style={{ maxWidth: 920 }}>
      <h1 className="serif" style={{ fontSize: 26 }}>
        {name} · Scan data
      </h1>
      <p className="muted">
        Enter this patient&apos;s scan systems — saving updates their body map.
      </p>
      <p className="muted" style={{ display: "flex", gap: 16 }}>
        <Link href={`/body/${patientId}`}>← Body map</Link>
        <Link href={`/body/${patientId}`}>View body map →</Link>
      </p>
      <BodymapEditor
        patientId={patientId}
        initialParts={initialParts}
        initialCross={initialCross}
      />
    </div>
  );
}
