import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & compliance",
  description:
    "How Central Health Intelligence protects patient data: HIPAA-ready BAAs, strict tenant isolation, MFA, append-only audit logs, AES-256-GCM encryption and modern security headers — across Cloud, HIPAA Cloud and Private Cloud editions.",
};

export default function SecurityPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Security &amp; compliance</p>
            <h1 className="mkt-display">
              Built for patient data
              <br />
              from the first row.
            </h1>
            <p className="mkt-lead">
              Healthcare buyers shouldn&apos;t have to take security on faith. Here is exactly how we
              isolate each clinic&apos;s data, who can see it, and what we record when they do.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Talk to security</Link>
              <Link href="/pricing" className="mkt-btn ghost lg">Compare editions</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A tenant-isolation check showing zero cross-tenant leaks across eighteen tables">
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Isolation check · nightly
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["Tables scoped by practice_id", "18 / 18"],
                  ["Row-level security policies", "enforced"],
                  ["Cross-tenant rows returned", "0"],
                  ["Connector tokens encrypted", "AES-256-GCM"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{k}</span>
                    <span style={{ fontSize: 12.5, color: "var(--green)" }}>● {v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: "11px 13px", background: "var(--mint-2)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5, color: "var(--ink-2)" }}>
                  <strong style={{ color: "var(--green)" }}>Passed</strong> · No record crossed a clinic boundary.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Tenant isolation ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Tenant isolation</p>
            <h2 className="mkt-h2">One clinic can never see another&apos;s data.</h2>
            <p className="mkt-p">
              Every record carries a <code style={{ fontFamily: "var(--serif)" }}>practice_id</code>. Row-level
              security enforces that boundary at the database, not just in application code — so a query
              physically cannot return another tenant&apos;s rows.
            </p>
            <ul className="mkt-points">
              <li>Row-level security on every patient-data table</li>
              <li>Verified: 0 cross-tenant rows returned across 18 tables</li>
              <li>Nightly isolation checks, re-run on every schema change</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {[
                  ["patients", "WHERE practice_id = :you"],
                  ["observations", "WHERE practice_id = :you"],
                  ["lab_results", "WHERE practice_id = :you"],
                  ["audit_log", "WHERE practice_id = :you"],
                ].map(([t, clause]) => (
                  <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 11, fontSize: 13.5 }}>
                    <strong>{t}</strong>
                    <span style={{ color: "var(--muted)", fontFamily: "var(--serif)", fontSize: 12.5 }}>{clause}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Controls (alternating, not an icon grid) ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ padding: 18 }}>
                {[
                  ["Staff MFA", "TOTP required"],
                  ["Audit log", "append-only · WORM"],
                  ["Connector tokens", "AES-256-GCM at rest"],
                  ["API rate limiting", "on"],
                  ["CSP / HSTS headers", "enforced"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14.5 }}>
                    <span>{k}</span>
                    <span style={{ fontSize: 12.5, color: "var(--green)" }}>● {v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">The controls underneath</p>
            <h2 className="mkt-h2">Defense at every layer.</h2>
            <p className="mkt-p">
              Access, storage and traffic are each hardened on their own — so a gap in one place
              doesn&apos;t become a breach.
            </p>
            <ul className="mkt-points">
              <li>MFA (TOTP) required for every staff account</li>
              <li>Append-only, WORM audit logs — nothing is silently edited or deleted</li>
              <li>AES-256-GCM encryption for connector tokens at rest</li>
              <li>Rate limiting on the API surface</li>
              <li>CSP and HSTS security headers on every response</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- The compliance ladder: editions ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The isolation ladder</p>
          <h2 className="mkt-h2">Three editions, increasing isolation.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>
            Same product. You choose how far apart your clinic&apos;s data sits from everyone else&apos;s.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                Shared multi-tenant. Strict row-level isolation by practice_id, full control stack,
                live in days. The fastest way to start.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13, margin: 0, color: "var(--green)", fontWeight: 600 }}>
                Logical isolation
              </p>
            </div>
            <div>
              <h3>HIPAA Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                Managed compliant tier: signed BAAs, US-PHI-ready, with the same controls operated to a
                documented compliance standard.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13, margin: 0, color: "var(--green)", fontWeight: 600 }}>
                Signed BAAs · US-PHI-ready
              </p>
            </div>
            <div>
              <h3>Private Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: "0 0 14px" }}>
                A dedicated, isolated instance on the clinic&apos;s own VPS. Physically separate,
                white-label, enterprise.
              </p>
              <p className="mkt-muted" style={{ fontSize: 13, margin: 0, color: "var(--green)", fontWeight: 600 }}>
                Dedicated instance · your infrastructure
              </p>
            </div>
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/pricing" className="mkt-btn ghost">See editions &amp; pricing</Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Security questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Are you HIPAA compliant?", "The HIPAA Cloud edition runs with signed BAAs and is US-PHI-ready, operating our controls to a documented compliance standard. Non-US clinics can start on Cloud, which uses the same technical isolation and security controls."],
              ["How do you guarantee tenant isolation?", "Every record carries a practice_id, and row-level security enforces that boundary in the database itself. We verify it continuously — the most recent check returned 0 cross-tenant rows across 18 tables."],
              ["How is staff access protected?", "Every staff account requires MFA via TOTP. All access is written to an append-only, WORM audit log that cannot be silently edited or deleted."],
              ["How are connector credentials stored?", "Tokens for wearable, CGM and lab connectors are encrypted at rest with AES-256-GCM. They are never exposed to other tenants or written to logs in plaintext."],
              ["What protects the application itself?", "Rate limiting on the API surface, plus CSP and HSTS headers on every response to defend against injection and downgrade attacks."],
              ["Can we run it on our own infrastructure?", "Yes — the Private Cloud edition is a dedicated, isolated instance on your own VPS, white-labeled to your clinic."],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Bring your security checklist.</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            We&apos;ll walk it line by line on a short call.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
