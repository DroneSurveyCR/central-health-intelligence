import Link from "next/link";
import Snapshot from "@/components/Snapshot";
import { requireStaff } from "@/lib/auth/roles";
import { getEnabledModules } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { INTAKE_SECTIONS } from "@/lib/intake/schema";
import AiSynthesisButton from "@/lib/ai/AiSynthesisButton";
import { aiEnabled } from "@/lib/ai";

export default async function PatientRecord({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const mods = await getEnabledModules();
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, first_name, last_name, sex, email, status_cached")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient)
    return <p className="muted">Client not found, or you don&apos;t have access.</p>;

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "patients", resourceId: id, patientId: id });

  const { data: intake } = await supabase
    .from("intake_forms")
    .select("form_data, completed, submitted_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fd = (intake?.form_data as Record<string, unknown>) ?? {};

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <span className={`badge ${patient.status_cached === "new" ? "new" : "existing"}`}>
          {patient.status_cached}
        </span>
      </div>
      <p className="muted">{patient.email}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <AiSynthesisButton patientId={patient.id} aiEnabled={aiEnabled} />
        <Link className="btn ghost" href={`/plan/${patient.id}`} style={{ textDecoration: "none" }}>90-day plan</Link>
        <Link className="btn ghost" href={`/scans/${patient.id}`} style={{ textDecoration: "none" }}>Scans &amp; body map</Link>
        <Link className="btn ghost" href={`/body/${patient.id}`} style={{ textDecoration: "none" }}>3D body</Link>
        <Link className="btn ghost" href={`/snapshot/${patient.id}`} style={{ textDecoration: "none" }}>Snapshot</Link>
        <Link className="btn ghost" href={`/progress/${patient.id}`} style={{ textDecoration: "none" }}>Progress</Link>
        <Link className="btn ghost" href={`/report/${patient.id}`} style={{ textDecoration: "none" }}>Report</Link>
        <Link className="btn ghost" href={`/notes/${patient.id}`} style={{ textDecoration: "none" }}>Visit notes</Link>
        <Link className="btn ghost" href={`/labs/${patient.id}`} style={{ textDecoration: "none" }}>Labs</Link>
        <Link className="btn ghost" href={`/messages/${patient.id}`} style={{ textDecoration: "none" }}>Messages</Link>
        <Link className="btn ghost" href={`/agreements/${patient.id}`} style={{ textDecoration: "none" }}>Agreements</Link>
        <Link className="btn ghost" href={`/payments/${patient.id}`} style={{ textDecoration: "none" }}>Payments</Link>
        <Link className="btn ghost" href={`/invoices/${patient.id}`} style={{ textDecoration: "none" }}>Invoices &amp; billing</Link>
        <a className="btn ghost" href={`/api/patient-data/export?patientId=${patient.id}`} download style={{ textDecoration: "none" }}>Export data</a>
        {/* Module-gated links — only shown for modules this practice has enabled */}
        {mods.has("labs") && <Link className="btn ghost" href={`/biomarker/${patient.id}`} style={{ textDecoration: "none" }}>Biomarkers</Link>}
        {mods.has("longevity") && <Link className="btn ghost" href={`/longevity/${patient.id}`} style={{ textDecoration: "none" }}>Longevity</Link>}
        {mods.has("peptide") && <Link className="btn ghost" href={`/peptide/${patient.id}`} style={{ textDecoration: "none" }}>Peptides</Link>}
        {mods.has("psychedelic") && <Link className="btn ghost" href={`/psychedelic/${patient.id}`} style={{ textDecoration: "none" }}>Plant medicine</Link>}
        {mods.has("nutrition") && <Link className="btn ghost" href={`/nutrition/${patient.id}`} style={{ textDecoration: "none" }}>Nutrition</Link>}
        {mods.has("wearables") && <Link className="btn ghost" href={`/wearables/${patient.id}`} style={{ textDecoration: "none" }}>Wearables</Link>}
        {mods.has("marketplace") && <Link className="btn ghost" href={`/modalities/${patient.id}`} style={{ textDecoration: "none" }}>Modalities</Link>}
        {mods.has("hrt") && <Link className="btn ghost" href={`/hrt/${patient.id}`} style={{ textDecoration: "none" }}>Hormones</Link>}
        {mods.has("chiro") && <Link className="btn ghost" href={`/spine/${patient.id}`} style={{ textDecoration: "none" }}>Spine</Link>}
        {mods.has("rx") && <Link className="btn ghost" href={`/rx/${patient.id}`} style={{ textDecoration: "none" }}>Prescriptions</Link>}
        {mods.has("weight") && <Link className="btn ghost" href={`/weight/${patient.id}`} style={{ textDecoration: "none" }}>Weight</Link>}
        {mods.has("dispensary") && <Link className="btn ghost" href={`/dispensary/${patient.id}`} style={{ textDecoration: "none" }}>Dispensary</Link>}
      </div>

      <div style={{ marginTop: 16 }}>
        <Snapshot patientId={patient.id} />
      </div>

      <h2 className="serif" style={{ fontSize: 19, marginTop: 24 }}>
        Intake {intake?.completed ? "· submitted" : "· in progress"}
      </h2>
      {!intake ? (
        <p className="muted">No intake started yet.</p>
      ) : (
        INTAKE_SECTIONS.map((sec) => {
          const answered = sec.fields.filter((f) => {
            const v = fd[f.id];
            return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
          });
          if (answered.length === 0) return null;
          return (
            <div key={sec.id} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--berry)" }}>
                {sec.title}
              </h3>
              <dl style={{ margin: "6px 0 0" }}>
                {answered.map((f) => {
                  const v = fd[f.id];
                  return (
                    <div key={f.id} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                      <dt className="muted" style={{ minWidth: 220, fontSize: 13 }}>{f.label}</dt>
                      <dd style={{ margin: 0, fontSize: 14 }}>
                        {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          );
        })
      )}
    </div>
  );
}
