import Link from "next/link";
import { getCurrentPatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth/audit";
import BodyMap, { type BodyMapFinding } from "@/lib/bodymap/BodyMap";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";

type Scan = {
  id: string;
  scan_type: string;
  scan_date: string | null;
  ai_synthesis: string | null;
  created_at: string;
};

const SEVERITY_KEY: Record<string, string> = {
  mild: "results_severity_mild",
  moderate: "results_severity_moderate",
  high: "results_severity_high",
};

export default async function ResultsPage() {
  const lang = await getServerLang();
  const me = await getCurrentPatient();
  if (!me) {
    // requirePatient-style guard, but we want the friendly tone if somehow unauth.
    return (
      <div>
        <h1 className="serif" style={{ fontSize: 26 }}>{t("results_title", lang)}</h1>
        <p className="muted">{t("results_signin", lang)}</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("scans")
    .select("id, scan_type, scan_date, ai_synthesis, created_at")
    .eq("patient_id", me.id)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scan = (latest ?? null) as Scan | null;

  if (!scan) {
    return (
      <div style={{ maxWidth: 680 }}>
        <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>
          {t("results_title", lang)}
        </h1>
        <p className="muted">
          {t("results_empty", lang)}
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn" href="/home" style={{ display: "inline-block", textDecoration: "none" }}>
            {t("back_to_home", lang)}
          </Link>
        </p>
      </div>
    );
  }

  // PHI read — audited.
  await logAudit({ action: "view", resource: "scans", resourceId: scan.id, patientId: me.id });

  const { data: fData } = await supabase
    .from("body_map_findings")
    .select("region_code, system, severity, finding_text")
    .eq("scan_id", scan.id);

  const findings = (fData ?? []) as BodyMapFinding[];

  // Plain-language summary derived from findings severity counts.
  const counts = { mild: 0, moderate: 0, high: 0 };
  for (const f of findings) {
    if (f.severity === "mild") counts.mild++;
    else if (f.severity === "moderate") counts.moderate++;
    else if (f.severity === "high") counts.high++;
  }
  const totalFlagged = counts.mild + counts.moderate + counts.high;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px" }}>
        {t("results_title", lang)}
      </h1>
      <p className="muted">
        {t("results_from_pre", lang)} {scan.scan_type} {t("results_from_on", lang)}{" "}
        {fmtDate(scan.scan_date ?? scan.created_at, lang)}.{" "}
        {t("results_from_post", lang)}
      </p>

      {/* Reassuring plain-language explanation */}
      <div className="card" style={{ marginTop: 18, padding: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, margin: "0 0 8px" }}>
          {t("results_plain_title", lang)}
        </h2>
        {totalFlagged === 0 ? (
          <p style={{ margin: 0 }}>
            {t("results_plain_clear", lang)}
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            {t("results_plain_flagged_pre", lang)} {totalFlagged}{" "}
            {totalFlagged === 1
              ? t("results_plain_flagged_area", lang)
              : t("results_plain_flagged_areas", lang)}{" "}
            {t("results_plain_flagged_post", lang)}
          </p>
        )}

        {scan.ai_synthesis && (
          <div style={{ marginTop: 14, padding: 14, background: "var(--paper)", borderRadius: 12 }}>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{scan.ai_synthesis}</p>
          </div>
        )}

        {totalFlagged > 0 && (
          <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 14 }}>
            {findings.map((f, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <b style={{ textTransform: "capitalize" }}>{f.system ?? t("results_general", lang)}</b>
                {f.severity
                  ? ` — ${t(SEVERITY_KEY[f.severity] ?? "results_severity_noted", lang)}`
                  : ""}.
                {f.finding_text ? ` ${f.finding_text}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Body map */}
      <h2 className="serif" style={{ fontSize: 19, marginTop: 28 }}>
        {t("results_bodymap_title", lang)}
      </h2>
      <p className="muted" style={{ marginTop: 4 }}>
        {t("results_bodymap_hint", lang)}
      </p>
      <div style={{ marginTop: 12 }}>
        <BodyMap findings={findings} />
      </div>
    </div>
  );
}

function fmtDate(iso: string, lang: Lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === "es" ? "es-CR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
