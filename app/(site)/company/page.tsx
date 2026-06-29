import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company",
  description:
    "Health Intelligency builds Central Health Intelligence: a clear 90-day plan for every client — built with AI, approved by the doctor, and tracked on both sides. For the longevity, functional-medicine and integrative practices mainstream EHRs overlook.",
};

export default function CompanyPage() {
  return (
    <>
      {/* ---- Hero / North Star ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Health Intelligency</p>
          <h1 className="mkt-display mkt-display-narrow">
            A plan every client <span className="mkt-lime-underline">follows</span>.
          </h1>
          <p className="mkt-lead mkt-hero-lead-wide">
            A clear 90-day plan, built with AI and approved by the doctor, that the client actually
            follows — with both sides tracking progress. That&apos;s our north star, and the whole reason
            the company exists.
          </p>
        </div>
      </section>

      {/* ---- The triangle ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How we think about it</p>
          <h2 className="mkt-h2">Doctor, AI, client — in that order.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            Good care isn&apos;t AI replacing the doctor. It&apos;s a triangle where each corner does what
            it&apos;s best at.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Doctors lead</h3>
              <p className="mkt-muted mkt-three-p">
                The doctor decides. The plan and the notes are drafts to approve — never an action taken
                on its own.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">AI does the work</h3>
              <p className="mkt-muted mkt-three-p">
                It reads the uploaded data, drafts the 90-day plan and the notes, and answers the
                client&apos;s questions — so neither side is buried in admin.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Clients follow</h3>
              <p className="mkt-muted mkt-three-p">
                A simple daily schedule they can actually keep — and their own copy of the record,
                portable on request.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Who we build for ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Who we build for</p>
            <h2 className="mkt-h2">The practices the big EHRs overlook.</h2>
            <p className="mkt-p">
              Mainstream EHRs were built for billing inside hospital systems. The practices doing
              proactive, plan-based medicine were left to improvise on spreadsheets and tools that
              don&apos;t talk to each other. We build for them.
            </p>
            <ul className="mkt-points">
              <li>Longevity and preventive medicine</li>
              <li>Functional and integrative medicine</li>
              <li>Practices that run structured, plan-based care</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-grid">
                {[
                  "Upload a scan, get a clear visual",
                  "AI drafts the 90-day plan",
                  "The doctor approves — always",
                ].map((t) => (
                  <div key={t} className="mkt-item">{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Principles ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-body">
                {[
                  ["The doctor is never out of the loop", "by design"],
                  ["Clients follow a clear plan", "scheduled"],
                  ["A practice's data stays its own", "isolated"],
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
            <p className="mkt-kicker">What we hold to</p>
            <h2 className="mkt-h2">A few things we won&apos;t trade away.</h2>
            <p className="mkt-p">
              We&apos;re a small team building for the doctors we listen to closely. These hold whether
              you&apos;re our first practice or our hundredth.
            </p>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Building a practice like this?</h2>
          <p className="mkt-lead mkt-cta-lead">
            We&apos;d like to hear how you practice. Let&apos;s talk.
          </p>
          <Link href="/contact" className="mkt-btn lg">Get in touch</Link>
        </div>
      </section>
    </>
  );
}
