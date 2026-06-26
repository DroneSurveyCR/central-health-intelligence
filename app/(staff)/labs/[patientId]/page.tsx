import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import {
  summarizePerMarker,
  groupByCategory,
  type LabResult,
} from "@/lib/labs/helpers";
import { MarkerCard } from "@/lib/labs/components";
import LabEntry from "./LabEntry";

export default async function StaffLabsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const lang = await getServerLang();
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!patient) {
    return (
      <p className="muted">
        Patient not found, or you don&apos;t have access.
      </p>
    );
  }

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "labs", patientId });

  const { data } = await supabase
    .from("lab_results")
    .select(
      "id, patient_id, marker, value, unit, optimal_low, optimal_high, category, collected_on, created_at",
    )
    .eq("patient_id", patientId)
    .order("collected_on", { ascending: true });

  const rows = (data ?? []) as LabResult[];
  const summaries = summarizePerMarker(rows);
  const groups = groupByCategory(summaries);

  return (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>
          {patient.first_name} {patient.last_name}
        </h1>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          {t("labs_back_to_record", lang)}
        </Link>
      </div>
      <p className="muted">{t("labs_title", lang)}</p>

      <LabEntry patientId={patientId} />

      {groups.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>{t("labs_empty", lang)}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.category} style={{ marginTop: 24 }}>
            <h2
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "var(--berry)",
                margin: "0 0 10px",
              }}
            >
              {g.category}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {g.markers.map((m) => (
                <MarkerCard key={m.marker} m={m} lang={lang} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
