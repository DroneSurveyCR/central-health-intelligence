import { getCurrentPatient } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import { type LabResult } from "@/lib/labs/helpers";
import { buildReport } from "@/lib/report/build";
import { ReportView } from "@/lib/report/components";

export default async function PatientReportPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const report = await buildReport(supabase, me.id);

  // Full per-marker lab history (one query) to power trend sparklines. RLS
  // scopes this to the patient's own rows; ordered oldest → newest.
  const { data: labReadings } = await supabase
    .from("lab_results")
    .select("marker, value, collected_on, created_at")
    .eq("patient_id", me.id)
    .order("collected_on", { ascending: true });
  const readingsByMarker = new Map<string, number[]>();
  for (const r of (labReadings ?? []) as Pick<LabResult, "marker" | "value">[]) {
    if (typeof r.value !== "number" || !Number.isFinite(r.value)) continue;
    const list = readingsByMarker.get(r.marker) ?? [];
    list.push(r.value);
    readingsByMarker.set(r.marker, list);
  }

  await logAudit({ action: "view", resource: "report", patientId: me.id });

  if (!report) {
    return (
      <div className="report" style={{ maxWidth: 760 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 8px" }}>
          {t("report_hero_title", lang)}
        </h1>
        <div className="card">
          <p style={{ margin: 0 }}>{t("report_empty", lang)}</p>
        </div>
      </div>
    );
  }

  return <ReportView report={report} lang={lang} readingsByMarker={readingsByMarker} />;
}
