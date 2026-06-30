import Link from "next/link";

export const metadata = {
  title: "Pricing — Central Health Intelligence",
  description:
    "A per-provider plan with the always-on platform — intake, scheduling, the AI 90-day plan, the client app and tracking — plus the modules you choose. Three editions: Cloud, HIPAA Cloud and Private Cloud. Honest pricing, live in days.",
};

const MODULES: [string, string, string][] = [
  ["Labs", "Upload panels, mapped to trends", "$39"],
  ["Nutrition", "Plans, logging, adherence", "$39"],
  ["Dispensary", "Sell supplements off the plan", "$39"],
  ["Telehealth", "Video visits in the record", "$49"],
  ["Reports", "Client-facing summaries", "$29"],
  ["Multi-site", "Run several locations", "$99"],
];

const COMPARISON: { product: string; what: string; price: string; ai: string; patient: string; chi?: boolean }[] = [
  {
    product: "Central Health Intelligence",
    what: "AI 90-day plans + client app",
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
          <p className="mkt-lead mkt-hero-lead-wide">
            A per-provider monthly plan includes the always-on platform — intake, scheduling, the AI
            90-day plan and notes, the client app with its AI assistant, your dispensary and email list,
            and progress tracking on both sides. Add only the modules your specialty needs.
          </p>
          <div className="mkt-hero-cta">
            <Link href="/contact?intent=pricing" className="mkt-btn lg">Talk to us</Link>
            <Link href="/product" className="mkt-btn ghost lg">See how it works →</Link>
          </div>
        </div>
      </section>

      {/* ---- Editions ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Three editions</p>
          <h2 className="mkt-h2">Choose the isolation your practice needs.</h2>
          <p className="mkt-lead mkt-p-lead-md">
            Same product, same modules — the difference is where it runs and how it&apos;s governed.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                Shared multi-tenant cloud. Fastest and most affordable — live in days. Best for practices
                outside the US PHI regime.
              </p>
              <Link href="/contact?intent=pricing" className="mkt-btn ghost">Talk to us</Link>
            </div>
            <div>
              <h3 className="mkt-h3">HIPAA Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                Managed compliant tier with signed BAAs and US-PHI-ready controls. The default for US
                practices handling protected health information.
              </p>
              <Link href="/contact?intent=pricing" className="mkt-btn ghost">Talk to us</Link>
            </div>
            <div>
              <h3 className="mkt-h3">Private Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                A dedicated, isolated instance on your practice&apos;s own VPS. White-label and enterprise,
                with full data residency control.
              </p>
              <Link href="/contact?intent=pricing" className="mkt-btn ghost">Talk to us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Plan model ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The plan</p>
          <h2 className="mkt-h2">Priced per provider. Nothing hidden.</h2>
          <p className="mkt-lead mkt-p-lead-md">
            One monthly plan per provider includes the always-on platform. Solo runs a single provider;
            Clinic adds providers per seat.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Solo</h3>
              <p className="mkt-muted mkt-three-p">
                One provider. The full platform — intake, scheduling, the AI 90-day plan and notes, the
                client app and tracking — always on.
              </p>
              <p className="mkt-three-sub">Add modules à la carte below.</p>
            </div>
            <div>
              <h3 className="mkt-h3">Clinic</h3>
              <p className="mkt-muted mkt-three-p">
                Multiple providers, billed per seat. Shared schedule, shared client records, role-based
                access — the same platform across the team.
              </p>
              <p className="mkt-three-sub">Volume pricing as seats grow.</p>
            </div>
            <div>
              <h3 className="mkt-h3">HIPAA setup</h3>
              <p className="mkt-muted mkt-three-p">
                A one-time compliance setup fee — <strong className="mkt-ink">$2,000–5,000</strong> —
                covering compliant provisioning, BAA, data migration and white-glove onboarding.
              </p>
              <p className="mkt-three-sub">Applies to HIPAA Cloud and Private Cloud.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Module add-ons ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Add what you need</p>
          <h2 className="mkt-h2">Modules, per month.</h2>
          <p className="mkt-lead mkt-p-lead-md">
            Start with the platform. Switch on a module the day you need it — and only pay for what you run.
          </p>
          <div className="mkt-module-list">
            {MODULES.map(([name, desc, price]) => (
              <div key={name} className="mkt-module-list-row">
                <div>
                  <div className="mkt-module-list-name">{name}</div>
                  <div className="mkt-module-list-desc">{desc}</div>
                </div>
                <div className="mkt-price-display">
                  {price}<span className="mkt-price-unit"> / mo</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mkt-note">
            Module pricing is per provider, per month. We&apos;ll map a package to your specialty on the call.
          </p>
        </div>
      </section>

      {/* ---- Comparison table ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How we compare</p>
          <h2 className="mkt-h2">A plan they follow, not a filing cabinet.</h2>
          <p className="mkt-lead mkt-p-lead-md">
            Legacy EHRs store records and price per provider. We price the same way — and add the
            AI-drafted 90-day plan, the doctor-approves workflow and the client app they don&apos;t offer.
          </p>
          <div className="mkt-table-clip">
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>What it is</th>
                  <th>Typical price</th>
                  <th>AI plan + doctor-<br />approves?</th>
                  <th>Client app + AI assistant?</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.product} className={row.chi ? "mkt-hl" : undefined}>
                    <td>{row.product}</td>
                    <td>{row.what}</td>
                    <td>{row.price}</td>
                    <td className={row.chi ? "accent" : undefined}>{row.ai}</td>
                    <td className={row.chi ? "accent" : undefined}>{row.patient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          <p className="mkt-note">
            Competitor prices reflect publicly cited ranges from industry SaaS pricing surveys and vary by
            plan, term and add-ons. Central Health Intelligence goes live in days, not the 12–24-month
            implementations enterprise EHRs require.
          </p>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Let&apos;s price it for your practice.</h2>
          <p className="mkt-lead mkt-cta-lead">
            Tell us your specialty and team size — we&apos;ll map a plan, the modules and the right edition.
          </p>
          <div className="mkt-hero-cta center">
            <Link href="/contact?intent=get_started" className="mkt-btn lg">Get the software →</Link>
            <Link href="/contact?intent=pricing" className="mkt-btn ghost lg">Talk to us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
