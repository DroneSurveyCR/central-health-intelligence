import DeleteAccountButton from "./DeleteAccountButton";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

const INCLUDED_KEYS = [
  "privacy_inc_profile",
  "privacy_inc_intake",
  "privacy_inc_visits",
  "privacy_inc_labs",
  "privacy_inc_body",
  "privacy_inc_plans",
  "privacy_inc_appts",
  "privacy_inc_billing",
  "privacy_inc_messages",
  "privacy_inc_agreements",
  "privacy_inc_files",
] as const;

export default async function PrivacyPage() {
  const lang = await getServerLang();
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        {t("privacy_title", lang)}
      </h1>
      <p className="muted">{t("privacy_subtitle", lang)}</p>

      {/* Data ownership / right of portability */}
      <div className="card" style={{ maxWidth: "none", marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 18, margin: "0 0 6px" }}>
          {t("privacy_own_title", lang)}
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
          {t("privacy_own_body", lang)}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <a
          className="btn"
          href="/api/patient-data/export"
          style={{ textDecoration: "none" }}
          download
        >
          {t("privacy_download", lang)}
        </a>
        <DeleteAccountButton />
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        {t("privacy_hint", lang)}
      </p>

      {/* What's included */}
      <div style={{ marginTop: 22 }}>
        <p className="eyebrow" style={{ margin: "0 0 4px" }}>
          {t("privacy_included_title", lang)}
        </p>
        <p className="muted" style={{ margin: "0 0 10px", fontSize: 13.5 }}>
          {t("privacy_included_intro", lang)}
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13.5,
            lineHeight: 1.8,
            color: "var(--ink)",
          }}
        >
          {INCLUDED_KEYS.map((k) => (
            <li key={k}>{t(k, lang)}</li>
          ))}
        </ul>
      </div>

      <p
        style={{
          marginTop: 22,
          fontSize: 13.5,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <a href="/legal/privacy" style={{ color: "var(--berry)" }}>
          Privacy Policy
        </a>
        <a href="/legal/terms" style={{ color: "var(--berry)" }}>
          Terms of Service
        </a>
        <a href="/legal/notice" style={{ color: "var(--berry)" }}>
          HIPAA Notice
        </a>
      </p>
    </div>
  );
}
