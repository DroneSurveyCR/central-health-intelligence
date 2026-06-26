import Link from "next/link";
import { requireStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import { buildReport } from "@/lib/report/build";
import { ReportView } from "@/app/(patient)/report/page";

export default async function StaffReportPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireStaff();
  const lang = await getServerLang();
  const { patientId } = await params;
  const supabase = await createClient();

  const report = await buildReport(supabase, patientId);

  // PHI read — must be audited (no SELECT trigger).
  await logAudit({ action: "view", resource: "report", patientId });

  if (!report) {
    return (
      <div style={{ maxWidth: 760 }}>
        <Link
          className="btn ghost no-print"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          ← {t("report_back_to_record", lang)}
        </Link>
        <p className="muted" style={{ marginTop: 16 }}>
          {t("report_empty", lang)}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 14px" }}>
        <Link
          className="btn ghost"
          href={`/patients/${patientId}`}
          style={{ textDecoration: "none", padding: "4px 12px", fontSize: 14 }}
        >
          ← {t("report_back_to_record", lang)}
        </Link>
      </div>
      <ReportView report={report} lang={lang} />
    </div>
  );
}
