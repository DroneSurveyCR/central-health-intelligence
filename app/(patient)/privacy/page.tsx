import DeleteAccountButton from "./DeleteAccountButton";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

export default async function PrivacyPage() {
  const lang = await getServerLang();
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        {t("privacy_title", lang)}
      </h1>
      <p className="muted">
        {t("privacy_subtitle", lang)}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <a className="btn" href="/api/patient-data/export" style={{ textDecoration: "none" }}>
          {t("privacy_download", lang)}
        </a>
        <DeleteAccountButton />
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        {t("privacy_hint", lang)}
      </p>
      <p style={{ marginTop: 18, fontSize: 13.5, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <a href="/legal/privacy" style={{ color: "var(--berry)" }}>Privacy Policy</a>
        <a href="/legal/terms" style={{ color: "var(--berry)" }}>Terms of Service</a>
        <a href="/legal/notice" style={{ color: "var(--berry)" }}>HIPAA Notice</a>
      </p>
    </div>
  );
}
