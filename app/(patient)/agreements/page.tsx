import { requirePatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AGREEMENT_TEMPLATES } from "@/lib/agreements/templates";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";
import SignaturePad from "./SignaturePad";

export default async function AgreementsPage() {
  const lang = await getServerLang();
  const me = await requirePatient();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("agreements")
    .select("id, type, document_ref, signature_ref, signed_at")
    .eq("patient_id", me.id);

  const byType = new Map(
    (rows ?? []).map((r) => [r.type as string, r]),
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>
        {t("agreements_title", lang)}
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {t("agreements_subtitle", lang)}
      </p>

      {AGREEMENT_TEMPLATES.map((tpl) => {
        const existing = byType.get(tpl.key);
        const signed = Boolean(existing?.signed_at);
        return (
          <section key={tpl.key} className="card" style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h2 className="serif" style={{ fontSize: 19, margin: 0 }}>
                {tpl.title}
              </h2>
              {signed ? (
                <span style={{ ...pillStyle, background: "var(--berry)", color: "#fff", borderColor: "var(--berry)" }}>
                  {t("agreements_signed", lang)}
                </span>
              ) : (
                <span style={pillStyle}>{t("agreements_not_signed", lang)}</span>
              )}
            </div>

            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                marginTop: 12,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: 11,
                background: "var(--sand)",
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-line",
              }}
            >
              {tpl.body}
            </div>

            {signed ? (
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                {t("agreements_signed_on", lang)}{" "}
                {new Date(existing!.signed_at as string).toLocaleString(
                  lang === "es" ? "es-CR" : "en-US",
                )}
                .
              </p>
            ) : (
              <SignaturePad agreementKey={tpl.key} title={tpl.title} />
            )}
          </section>
        );
      })}
    </div>
  );
}

const pillStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  whiteSpace: "nowrap",
} as const;
