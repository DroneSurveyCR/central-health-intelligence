import { getCurrentPatient } from "@/lib/auth/roles";
import { MEMBERSHIP_PLANS, type MembershipPlan } from "@/lib/memberships/plans";
import { getServerLang } from "@/lib/i18n/getServerLang";
import { t, type Lang } from "@/lib/i18n/dictionary";
import MembershipClient from "./MembershipClient";

export default async function MembershipsPage() {
  // Render for everyone; greet by name if we have a patient session.
  const lang = await getServerLang();
  const me = await getCurrentPatient();

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 4px" }}>
        {t("memberships_title", lang)}
      </h1>
      <p className="muted" style={{ maxWidth: 620 }}>
        {t("memberships_intro_pre", lang)}{me?.first_name ? `, ${me.first_name}` : ""}
        {t("memberships_intro_post", lang)}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
          marginTop: 26,
          alignItems: "stretch",
        }}
      >
        {MEMBERSHIP_PLANS.map((plan) => (
          <PlanCard key={plan.key} plan={plan} lang={lang} />
        ))}
      </div>

      <p className="muted" style={{ marginTop: 22, fontSize: 13 }}>
        {t("memberships_footer", lang)}
      </p>
    </div>
  );
}

function PlanCard({ plan, lang }: { plan: MembershipPlan; lang: Lang }) {
  const price = plan.priceMonthly.toFixed(0);
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderColor: plan.highlighted ? "var(--berry)" : "var(--line)",
        boxShadow: plan.highlighted ? "0 0 0 2px var(--berry)" : undefined,
      }}
    >
      {plan.highlighted && (
        <span
          style={{
            position: "absolute",
            top: -11,
            left: 18,
            background: "var(--berry)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {t("memberships_most_popular", lang)}
        </span>
      )}

      <h2 className="serif" style={{ fontSize: 22, margin: "2px 0 0" }}>
        {plan.name}
      </h2>

      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "var(--berry)" }}>
          ${price}
        </span>
        <span className="muted" style={{ fontSize: 14 }}>{t("memberships_per_month", lang)}</span>
      </div>

      <p style={{ marginTop: 10, lineHeight: 1.5, fontSize: 14 }}>{plan.blurb}</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", flex: 1 }}>
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              padding: "6px 0",
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: "var(--berry)", fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16 }}>
        <MembershipClient plan={plan} />
      </div>
    </div>
  );
}
