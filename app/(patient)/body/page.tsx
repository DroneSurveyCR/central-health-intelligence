import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Finding } from "@/lib/body3d/Body3D";
import BodyMapTabs from "@/lib/body3d/BodyMapTabs";

export default async function PatientBody3DPage() {
  const patient = await getCurrentPatient();
  if (!patient) return <p className="muted">Please sign in.</p>;
  const supabase = await createClient();

  const { data: scans } = await supabase
    .from("scans")
    .select("id, scan_date, ai_synthesis")
    .eq("patient_id", patient.id)
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
  const fAfter: Finding[] = (findings ?? []).filter((f) => f.scan_id === after?.id);

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="serif" style={{ fontSize: 28 }}>Your body map</h1>
      <p className="muted">
        An anatomical map of your scan. Switch between the 2D layered view and the full 3D model,
        toggle each system, and tap any part to see its detail.
      </p>
      {!after ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Your 3D body map will appear here after your first scan.
        </p>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <BodyMapTabs title="Your body map" />
          </div>
          {after.ai_synthesis && (
            <div className="card" style={{ maxWidth: "none", marginTop: 16 }}>
              <h3 className="serif" style={{ marginTop: 0 }}>What this means</h3>
              <p style={{ margin: 0 }}>{after.ai_synthesis}</p>
            </div>
          )}
          <section style={{ marginTop: 24 }} aria-label="Findings from your latest scan">
            <h2 className="serif" style={{ fontSize: 22, margin: 0 }}>What we found</h2>
            {fAfter.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Good news — no findings were flagged on your latest scan.
              </p>
            ) : (
              <ul className="findings-list">
                {fAfter.map((f, i) => (
                  <li key={`${f.region_code ?? "region"}-${i}`}>
                    <span className="fl-region">{f.region_code || "Body"}</span>
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
