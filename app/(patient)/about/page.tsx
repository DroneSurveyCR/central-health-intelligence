import { getPractice, getServices, getPublicStaff } from "@/lib/practice";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t } from "@/lib/i18n/dictionary";

export default async function AboutPage() {
  const lang = await getServerLang();
  const [practice, services, staff] = await Promise.all([
    getPractice(),
    getServices(),
    getPublicStaff(),
  ]);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 4px" }}>
        {practice?.name ?? t("about_practice_fallback", lang)}
      </h1>
      {practice?.tagline && <p className="muted">{practice.tagline}</p>}
      {practice?.about && <p style={{ marginTop: 12, lineHeight: 1.6 }}>{practice.about}</p>}

      {staff.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 className="serif" style={{ fontSize: 20 }}>{t("about_team", lang)}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginTop: 10 }}>
            {staff.map((p) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <b>{p.name}</b>
                {p.title && <div className="muted" style={{ fontSize: 13 }}>{p.title}</div>}
                {p.specialties && <div style={{ fontSize: 13, marginTop: 6 }}>{p.specialties}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 className="serif" style={{ fontSize: 20 }}>{t("about_services", lang)}</h2>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
            {services.map((s) => (
              <li key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span>
                  <b>{s.name}</b>
                  {s.description && <span className="muted"> — {s.description}</span>}
                </span>
                {s.price != null && <span className="muted">${s.price}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
