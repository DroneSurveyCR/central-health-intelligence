import Link from "next/link";

export const metadata = {
  title: "Pricing — Central Health Intelligence",
  description:
    "A per-provider plan with the always-on platform, plus the modules you choose. Three editions — Cloud, HIPAA Cloud and Private Cloud. Honest pricing, live in days.",
};

const MODULES: [string, string, string][] = [
  ["Labs", "Panels mapped to trends", "$39"],
  ["Wearables / CGM", "Oura, Dexcom, Garmin, Withings", "$49"],
  ["Peptide / KAP / HRT", "Protocols for plant-medicine & hormones", "$79"],
  ["Longevity", "Biological-age & risk tracking", "$49"],
  ["Nutrition", "Plans, logging, adherence", "$39"],
  ["e-Prescribing", "Send & track prescriptions", "$49"],
  ["Telehealth", "Video visits in the record", "$49"],
  ["Dispensary", "In-clinic products & supplements", "$39"],
  ["Reports", "Patient-facing summaries", "$29"],
  ["Marketplace", "Connect outside services", "$49"],
  ["Multi-site", "Run several locations", "$99"],
];

const COMPARISON: { product: string; what: string; price: string; ai: string; patient: string; chi?: boolean }[] = [
  {
    product: "Central Health Intelligence",
    what: "Live-data EHR + AI + patient layer",
    price: "Per-provider plan + modules",
    ai: "Yes / Yes",
    patient: "Yes",
    chi: true,
  },
  { product: "Kareo / Tebra", what: "Practice management + EHR", price: "$200–400 / provider / mo", ai: "No / No", patient: "No" },
  { product: "DrChrono", what: "EHR + practice management", price: "$199–399 / provider / mo", ai: "No / No", patient: "No" },
  { product: "CareCloud", what: "EHR + revenue cycle", price: "$250–450 / provider / mo", ai: "No / No", patient: "No" },
  { product: "SimplePractice", what: "Solo / small-practice EHR", price: "$29–99 / mo (solo)", ai: "No / No", patient: "No" },
  { product: "Epic", what: "Enterprise hospital EHR", price: "Enterprise, 12–24-month implementation", ai: "No / No", patient: "No" },
];

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
  fontWeight: 600,
  fontSize: 13.5,
  color: "var(--ink)",
  background: "var(--mint)",
  verticalAlign: "bottom",
};
const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--line)",
  borderRight: "1px solid var(--line)",
  fontSize: 14.5,
  color: "var(--ink-2)",
  verticalAlign: "top",
};

export default function PricingPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Pricing</p>
          <h1 className="mkt-display">
            One plan per provider.
            <br />
            The modules you <span className="mkt-lime-underline">actually use</span>.
          </h1>
          <p className="mkt-lead" style={{ marginTop: 18 }}>
            A per-provider monthly plan includes the always-on platform — EHR core, scheduling, billing,
            patient portal, engagement, the intelligence and AI layer, and the connector engine. Add only
            the modules your specialty needs. At parity with a legacy EHR, with the live-data and AI layer
            they don&apos;t have.
          </p>
          <div className="mkt-hero-cta">
            <Link href="/contact" className="mkt-btn lg">Talk to us</Link>
            <Link href="/modules" className="mkt-btn ghost lg">See the modules</Link>
          </div>
        </div>
      </section>

      {/* ---- Editions ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Three editions</p>
          <h2 className="mkt-h2">Choose the isolation your clinic needs.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>
            Same product, same modules — the difference is where it runs and how it&apos;s governed.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 18px" }}>
                Shared multi-tenant cloud. Fastest and most affordable — live in days. Best for clinics
                outside the US PHI regime.
              </p>
              <Link href="/contact" className="mkt-btn ghost">Talk to us</Link>
            </div>
            <div>
              <h3>HIPAA Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 18px" }}>
                Managed compliant tier with signed BAAs and US-PHI-ready controls. The default for US
                clinics handling protected health information.
              </p>
              <Link href="/contact" className="mkt-btn ghost">Talk to us</Link>
            </div>
            <div>
              <h3>Private Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 18px" }}>
                A dedicated, isolated instance on your clinic&apos;s own VPS. White-label and enterprise,
                with full data residency control.
              </p>
              <Link href="/contact" className="mkt-btn ghost">Talk to us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Plan model ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The plan</p>
          <h2 className="mkt-h2">Priced per provider. Nothing hidden.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>
            One monthly plan per provider includes the always-on platform. Solo runs a single provider;
            Clinic adds providers per seat.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Solo</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                One provider. The full platform — EHR core, scheduling, billing, patient portal,
                engagement, intelligence, AI and connectors — always on.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13.5, margin: 0 }}>Add modules à la carte below.</p>
            </div>
            <div>
              <h3>Clinic</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                Multiple providers, billed per seat. Shared schedule, shared patient records, role-based
                access — the same live-data platform across the team.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13.5, margin: 0 }}>Volume pricing as seats grow.</p>
            </div>
            <div>
              <h3>HIPAA setup</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                A one-time compliance setup fee — <strong style={{ color: "var(--ink)" }}>$2,000–5,000</strong> —
                covering compliant provisioning, BAA, data migration and white-glove onboarding.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13.5, margin: 0 }}>Applies to HIPAA Cloud and Private Cloud.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Module add-ons ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Land and expand</p>
          <h2 className="mkt-h2">Modules, per month.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>
            Start with the platform. Switch on a module the day you need it — and only pay for what you run.
          </p>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            {MODULES.map(([name, desc, price], i) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 24,
                  padding: "16px 20px",
                  borderBottom: i === MODULES.length - 1 ? "none" : "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: "var(--ink)" }}>{name}</div>
                  <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{desc}</div>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--ink)", whiteSpace: "nowrap" }}>
                  {price}
                  <span style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--sans)" }}> / mo</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mkt-muted" style={{ fontSize: 13.5, marginTop: 16 }}>
            Module pricing is per provider, per month. We&apos;ll map a package to your specialty on the call.
          </p>
        </div>
      </section>

      {/* ---- Comparison table ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How we compare</p>
          <h2 className="mkt-h2">A live picture, not a filing cabinet.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>
            Legacy EHRs store records and price per provider. We price the same way — and add the live-data,
            doctor-in-the-loop AI and patient-owned layer they don&apos;t offer.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 720,
                borderCollapse: "collapse",
                border: "1px solid var(--line)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Product</th>
                  <th style={th}>What it is</th>
                  <th style={th}>Typical price</th>
                  <th style={th}>
                    Live data + doctor-
                    <br />
                    in-the-loop AI?
                  </th>
                  <th style={{ ...th, borderRight: "none" }}>Patient-owned layer?</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.product} style={row.chi ? { background: "var(--mint-2)" } : undefined}>
                    <td style={{ ...td, fontWeight: row.chi ? 600 : 500, color: "var(--ink)" }}>{row.product}</td>
                    <td style={td}>{row.what}</td>
                    <td style={td}>{row.price}</td>
                    <td style={{ ...td, color: row.chi ? "var(--green)" : "var(--ink-2)", fontWeight: row.chi ? 600 : 400 }}>
                      {row.ai}
                    </td>
                    <td
                      style={{
                        ...td,
                        borderRight: "none",
                        color: row.chi ? "var(--green)" : "var(--ink-2)",
                        fontWeight: row.chi ? 600 : 400,
                      }}
                    >
                      {row.patient}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mkt-muted" style={{ fontSize: 13, marginTop: 16 }}>
            Competitor prices reflect publicly cited ranges from industry SaaS pricing surveys and vary by
            plan, term and add-ons. Central Health Intelligence goes live in days, not the 12–24-month
            implementations enterprise EHRs require.
          </p>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Let&apos;s price it for your clinic.</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            Tell us your specialty and team size — we&apos;ll map a plan, the modules and the right edition.
          </p>
          <Link href="/contact" className="mkt-btn lg">Talk to us</Link>
        </div>
      </section>
    </>
  );
}
