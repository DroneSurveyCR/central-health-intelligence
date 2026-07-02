import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import SpineAssessmentEditor from "./SpineAssessmentEditor";
import { scoreSpine } from "@/lib/spine/score";
import {
  blankSpineConditions,
  type SpineConditions,
  type SpineSeverity,
  type VertebraFinding,
} from "@/lib/spine/schema";

export default async function StaffSpinePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const prac = await requireStaff();
  await requireModule("chiro");
  const { patientId } = await params;
  const supabase = await createClient();

  // Which spine viewer the super-admin enabled for this tenant (2d | 3d | both).
  let spineViewer = "both";
  if (prac?.practice_id) {
    const { data: pr } = await supabase
      .from("practices")
      .select("settings")
      .eq("id", prac.practice_id)
      .maybeSingle();
    spineViewer = ((pr?.settings as Record<string, unknown> | null)?.spine_viewer as string) ?? "both";
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return <p className="muted">Client not found, or you don&apos;t have access.</p>;
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "spine", patientId });

  const { data: history } = await supabase
    .from("spine_assessments")
    .select("id, assessment_date, vertebrae, conditions, regions, voice_notes, thermal_ref, status")
    .eq("patient_id", patientId)
    .order("assessment_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(50);

  const list = history ?? [];
  const latest = list.length ? list[list.length - 1] : null;
  const scoreHistory = list.map((a) => ({
    date: String(a.assessment_date ?? ""),
    score: scoreSpine(
      Array.isArray(a.vertebrae) ? (a.vertebrae as VertebraFinding[]) : [],
      (a.conditions && typeof a.conditions === "object" ? a.conditions : blankSpineConditions()) as SpineConditions,
      Array.isArray(a.regions) ? (a.regions as { severity: SpineSeverity }[]) : [],
    ).score,
  }));

  return (
    <div style={{ maxWidth: 940 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          Back to record
        </Link>
      </div>
      <p className="muted">Spine assessment</p>

      <SpineAssessmentEditor patientId={patientId} existing={latest ?? null} viewer={spineViewer} scoreHistory={scoreHistory} />
    </div>
  );
}
