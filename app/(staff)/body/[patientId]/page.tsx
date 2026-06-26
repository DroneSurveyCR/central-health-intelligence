import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import type { Finding } from "@/lib/body3d/Body3D";
import BodyMapTabs from "@/lib/body3d/BodyMapTabs";

export default async function StaffBody3DPage({
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
  if (!patient) return <p className="muted">Patient not found, or you don&apos;t have access.</p>;

  await logAudit({ action: "view", resource: "body3d", resourceId: patientId, patientId });

  const { data: scans } = await supabase
    .from("scans")
    .select("id, scan_date, ai_synthesis")
    .eq("patient_id", patientId)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .limit(2);
  const list = scans ?? [];
  const after = list[0];
  const ids = list.map((s) => s.id);
  const { data: findings } = ids.length
    ? await supabase
        .from("body_map_findings")
        .select("scan_id, region_code, system, severity, finding_text")
        .in("scan_id", ids)
    : { data: [] as { scan_id: string; region_code: string | null; system: string | null; severity: string | null; finding_text: string | null }[] };
  const all = findings ?? [];
  const fAfter: Finding[] = all.filter((f) => f.scan_id === after?.id);

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="serif" style={{ fontSize: 26 }}>
        {patient.first_name} {patient.last_name} · Body map
      </h1>
      <p className="muted" style={{ display: "flex", gap: 16 }}>
        <Link href={`/scans/${patientId}`}>← Scans &amp; findings</Link>
        <Link href={`/body-edit/${patientId}`}>Edit scan data →</Link>
      </p>
      {!after ? (
        <p className="muted" style={{ marginTop: 16 }}>No scans on file yet.</p>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <BodyMapTabs title={`${patient.first_name} ${patient.last_name} — body map`} patient={patientId} />
          </div>
          {after.ai_synthesis && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="serif" style={{ marginTop: 0 }}>AI synthesis · latest scan</h3>
              <p style={{ margin: 0 }}>{after.ai_synthesis}</p>
            </div>
          )}
          <section style={{ marginTop: 24 }} aria-label="Findings from latest scan">
            <h2 className="serif" style={{ fontSize: 20, margin: 0 }}>Findings · latest scan</h2>
            {fAfter.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>No findings recorded on the latest scan.</p>
            ) : (
              <ul className="findings-list">
                {fAfter.map((f, i) => (
                  <li key={`${f.region_code ?? "region"}-${i}`}>
                    <span className="fl-region">{f.region_code || "Unspecified region"}</span>
                    {f.system && <span className="fl-meta">· {f.system}</span>}
                    <span className={`sev-chip ${(f.severity || "").toLowerCase()}`}>
                      {f.severity || "clear"}
                    </span>
                    {f.finding_text && <p className="fl-text">{f.finding_text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
