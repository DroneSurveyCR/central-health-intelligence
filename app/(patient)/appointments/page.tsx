import Link from "next/link";
import { requirePatient } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

const APPT_STATUS_KEY: Record<string, string> = {
  scheduled: "appt_status_scheduled",
  confirmed: "appt_status_confirmed",
  completed: "appt_status_completed",
  cancelled: "appt_status_cancelled",
  pending: "appt_status_pending",
};

export default async function AppointmentsPage() {
  const lang = await getServerLang();
  const locale = lang === "es" ? "es-CR" : "en-US";
  const patient = await requirePatient();
  const supabase = await createClient();

  const { data: me } = await supabase
    .from("patients")
    .select("ical_token")
    .eq("id", patient.id)
    .maybeSingle();

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, start_time, type, modality, status")
    .eq("patient_id", patient.id)
    .is("deleted_at", null)
    .order("start_time");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const icalUrl = me?.ical_token ? `${base}/api/ical/${me.ical_token}` : "";
  const list = appts ?? [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="serif" style={{ fontSize: 26, margin: 0 }}>{t("appointments_title", lang)}</h1>
        <Link className="btn" href="/book" style={{ textDecoration: "none" }}>{t("appointments_book_new", lang)}</Link>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            {t("appointments_empty", lang)}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
          {list.map((a) => (
            <li key={a.id} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 10 }}>
              <b>{new Date(a.start_time).toLocaleString(locale)}</b>
              <div className="muted" style={{ fontSize: 13 }}>
                {a.modality === "online" ? t("appointments_online", lang) : t("appointments_in_person", lang)}
                {" · "}
                {a.status ? t(APPT_STATUS_KEY[a.status] ?? a.status, lang) : ""}
              </div>
            </li>
          ))}
        </ul>
      )}

      {icalUrl && (
        <div style={{ marginTop: 22, padding: 14, background: "var(--paper)", borderRadius: 12 }}>
          <b style={{ fontSize: 14 }}>{t("appointments_ical_title", lang)}</b>
          <p className="muted" style={{ fontSize: 13, margin: "4px 0 8px" }}>
            {t("appointments_ical_hint", lang)}
          </p>
          <code style={{ fontSize: 12, wordBreak: "break-all" }}>{icalUrl}</code>
        </div>
      )}
    </div>
  );
}
