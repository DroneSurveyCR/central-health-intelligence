import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance & security",
  description:
    "How Central Health Intelligence protects client data: worldwide out of the box, with US HIPAA and Canadian compliance provisioned through partners (AWS hosting + a BAA-signing AI provider, in-region), strict tenant isolation, MFA, audit logs and AES-256 encryption — plus dedicated Private Cloud (VPS) deployments for multi-location groups.",
};

export default function SecurityPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Compliance &amp; security</p>
            <h1 className="mkt-display">
              Built for client data
              <br />
              from the first row.
            </h1>
            <p className="mkt-lead">
              Healthcare buyers shouldn&apos;t have to take security on faith. Here is exactly how we
              isolate each clinic&apos;s data, who can see it, and what we record when they do.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Talk to our team</Link>
              <Link href="/pricing" className="mkt-btn ghost lg">Compare editions</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="How Central Health Intelligence protects client data at a glance">
              <div className="mkt-mock-bar">Your client data · at a glance</div>
              <div className="mkt-mock-body">
                {[
                  ["Each clinic's data", "isolated"],
                  ["Every access", "logged · WORM"],
                  ["Encryption", "TLS · AES-256"],
                  ["Compliance", "HIPAA via partners"],
                  ["Where it runs", "cloud or your VPS"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-stat-val green">● {v}</span>
                  </div>
                ))}
                <div className="mkt-briefing-draft">
                  <strong className="mkt-draft-label">Yours</strong> · your data, in your jurisdiction.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Compliance & data residency ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device" role="img" aria-label="Deployment options: worldwide out of the box, with compliant US and Canada deployments through partners">
              <div className="mkt-mock-bar">Deployment options</div>
              <div className="mkt-mock-body">
                {[
                  ["Out of the box", "worldwide"],
                  ["US HIPAA / Canada", "on request"],
                  ["Hosting partner", "AWS · in-region"],
                  ["AI provider (signs BAA)", "Claude / OpenAI"],
                  ["Encryption", "TLS · AES-256"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-stat-val green">● {v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Compliance &amp; data residency</p>
            <h2 className="mkt-h2">Worldwide out of the box. Compliant where you need it.</h2>
            <p className="mkt-p">
              Out of the box, Central Health Intelligence runs anywhere in the world. When you need US
              HIPAA or Canadian compliance, we provision a compliant deployment through our partners —
              hosting on AWS in your region, with an AI provider that signs a BAA and processes in-region
              (Claude or OpenAI) — so your client data and the AI stay in the jurisdiction that governs
              them. We set this up with you.
            </p>
            <ul className="mkt-points">
              <li>Works worldwide out of the box — start anywhere, today</li>
              <li>US HIPAA and Canadian compliance provisioned through our partners</li>
              <li>Hosted on compliant infrastructure (AWS) in the region you serve</li>
              <li>AI via providers that sign BAAs and run in-region — Claude or OpenAI</li>
              <li>Encrypted in transit (TLS) and at rest (AES-256)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Controls ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-body">
                {[
                  ["Staff MFA", "TOTP required"],
                  ["Audit log", "append-only · WORM"],
                  ["Connector tokens", "AES-256-GCM at rest"],
                  ["API rate limiting", "on"],
                  ["CSP / HSTS headers", "enforced"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-stat-val green">● {v}</span>
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

      {/* ---- Private Cloud / VPS ---- */}
      <section className="mkt-section sand">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device" role="img" aria-label="A dedicated private-cloud instance with its resources and scale">
              <div className="mkt-mock-bar">Private Cloud · your-clinic.health</div>
              <div className="mkt-mock-body">
                {[
                  ["Instance", "dedicated · yours alone"],
                  ["Tenants on this server", "1"],
                  ["Locations", "unlimited"],
                  ["Doctors & staff", "unlimited"],
                  ["Data control", "fully yours"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-stat-val green">● {v}</span>
                  </div>
                ))}
                <div className="mkt-briefing-draft">
                  <strong className="mkt-draft-label">White-label</strong> · your brand, your domain, your box.
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Private Cloud · run it standalone</p>
            <h2 className="mkt-h2">Your own server. Faster, and fully private.</h2>
            <p className="mkt-p">
              For groups that want everything to themselves, we deploy a dedicated Private Cloud instance
              on your own VPS — standalone, with no neighbours sharing the machine. It&apos;s faster, the
              most secure tier, and your data stays entirely under your control.
            </p>
            <ul className="mkt-points">
              <li>A standalone, dedicated instance — your data on your own server</li>
              <li>Faster: no shared tenancy, resources are yours alone</li>
              <li>The most secure tier — full isolation and control</li>
              <li>Multi-location and multi-doctor, with unlimited users</li>
              <li>White-labeled to your brand, on your own domain</li>
            </ul>
            <div className="mkt-action">
              <Link href="/contact?intent=pricing" className="mkt-btn ghost">Talk about a private deployment</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- The isolation ladder ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The isolation ladder</p>
          <h2 className="mkt-h2">Three editions, increasing isolation.</h2>
          <p className="mkt-lead mkt-p-lead-md">
            Same product. You choose how far apart your clinic&apos;s data sits from everyone else&apos;s.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                Shared multi-tenant. Strict row-level isolation by practice_id, full control stack,
                live in days. The fastest way to start.
              </p>
              <p className="mkt-isolation-tier">Logical isolation</p>
            </div>
            <div>
              <h3>HIPAA Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                Managed compliant tier: signed BAAs, US-PHI-ready, with the same controls operated to a
                documented compliance standard.
              </p>
              <p className="mkt-isolation-tier">Signed BAAs · US-PHI-ready</p>
            </div>
            <div>
              <h3>Private Cloud</h3>
              <p className="mkt-muted mkt-three-p">
                A dedicated, isolated instance on the clinic&apos;s own VPS. Physically separate,
                white-label, enterprise.
              </p>
              <p className="mkt-isolation-tier">Dedicated instance · your infrastructure</p>
            </div>
          </div>
          <div className="mkt-cta-actions">
            <Link href="/pricing" className="mkt-btn ghost">See editions &amp; pricing</Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Compliance questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Are you HIPAA compliant?", "Out of the box, CHI runs worldwide. For US HIPAA or Canadian compliance, we provision a compliant deployment through our partners — hosting on AWS in your region and an AI provider that signs a BAA (Claude or OpenAI). We set this up with you as part of onboarding."],
              ["Where is our data hosted — does it stay in our country?", "By default you can run anywhere. When compliance requires it, we deploy on partner infrastructure (AWS) in your region so client data has residency in your jurisdiction. On Private Cloud it lives on your own server."],
              ["Does the AI run in our jurisdiction too?", "For compliant deployments we use AI providers (Claude or OpenAI) that sign BAAs and offer in-region processing, so protected health information stays in the jurisdiction that governs it."],
              ["Can we get a dedicated server for our group?", "Yes — Private Cloud is a standalone, dedicated instance on your own VPS: faster, fully isolated, white-labeled, and built for multi-location groups with many doctors and unlimited users."],
              ["Is one clinic's data separated from another's?", "Yes. Each clinic's data is isolated at the database layer, so one clinic's queries can't reach another's records. On Private Cloud, your data sits on a separate server entirely."],
              ["How is staff access protected?", "Every staff account requires MFA via TOTP. All access is written to an append-only, WORM audit log that cannot be silently edited or deleted."],
              ["How are uploads and credentials stored?", "Uploaded files and any connector credentials are encrypted at rest with AES-256-GCM. They are never exposed to other tenants or written to logs in plaintext."],
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
          <p className="mkt-lead mkt-cta-lead">
            We&apos;ll walk it line by line on a short call.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
