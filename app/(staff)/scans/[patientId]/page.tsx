import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import BodyMap, { type BodyMapFinding } from "@/lib/bodymap/BodyMap";
import ScanUpload from "./ScanUpload";

type Scan = {
  id: string;
  scan_type: string;
  scan_date: string | null;
  parse_status: string;
  ai_synthesis: string | null;
  created_at: string;
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    parsed: "#14834e",
    pending: "#cdbfa6",
    failed: "#c0392b",
  };
  const bg = map[status] ?? "#cdbfa6";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
        background: bg,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

export default async function StaffScansPage({
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

  // PHI read — audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "scans", resourceId: patientId, patientId });

  const { data: scansData } = await supabase
    .from("scans")
    .select("id, scan_type, scan_date, parse_status, ai_synthesis, created_at")
    .eq("patient_id", patientId)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const scans = (scansData ?? []) as Scan[];
  const latest = scans[0] ?? null;

  let findings: BodyMapFinding[] = [];
  if (latest) {
    const { data: fData } = await supabase
      .from("body_map_findings")
      .select("region_code, system, severity, finding_text")
      .eq("scan_id", latest.id);
    findings = (fData ?? []) as BodyMapFinding[];
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          Scans · {patient.first_name} {patient.last_name}
        </h1>
        <Link href={`/patients/${patient.id}`} className="muted" style={{ fontSize: 13 }}>
          ← Back to record
        </Link>
      </div>

      <div style={{ marginTop: 20 }}>
        <ScanUpload patientId={patientId} />
      </div>

      {scans.length === 0 ? (
        <p className="muted" style={{ marginTop: 24 }}>
          No scans on file yet. Upload one above to get started.
        </p>
      ) : (
        <>
          {/* Scan list */}
          <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
            Scan history
          </h2>
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {scans.map((s) => (
              <li
                key={s.id}
                className="card"
                style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
              >
                <span style={{ fontWeight: 600 }}>{fmtDate(s.scan_date ?? s.created_at)}</span>
                <span className="muted" style={{ textTransform: "capitalize" }}>{s.scan_type}</span>
                <StatusPill status={s.parse_status} />
                {s.id === latest?.id && (
                  <span className="muted" style={{ fontSize: 12 }}>· latest</span>
                )}
              </li>
            ))}
          </ul>

          {/* AI synthesis */}
          {latest?.ai_synthesis && (
            <div className="card" style={{ marginTop: 24, padding: 18 }}>
              <h2 className="serif" style={{ fontSize: 19, margin: "0 0 8px" }}>
                AI synthesis
              </h2>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{latest.ai_synthesis}</p>
            </div>
          )}

          {/* Body map */}
          <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
            Body map · latest scan
          </h2>
          <div style={{ marginTop: 12 }}>
            <BodyMap findings={findings} />
          </div>
        </>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
