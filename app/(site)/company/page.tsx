import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company",
  description:
    "Health Intelligency builds Central Health Intelligence: real-time health intelligence — every data source, one patient picture, doctor-supervised AI. For the longevity, functional-medicine and integrative clinics mainstream EHRs overlook.",
};

export default function CompanyPage() {
  return (
    <>
      {/* ---- Hero / North Star ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Health Intelligency</p>
          <h1 className="mkt-display mkt-display-narrow">
            One patient <span className="mkt-lime-underline">picture</span>, kept live.
          </h1>
          <p className="mkt-lead mkt-p-lead-md">
            Real-time health intelligence — every data source, one patient picture, doctor-supervised
            AI. That&apos;s our north star, and the whole reason the company exists.
          </p>
        </div>
      </section>

      {/* ---- The triangle ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How we think about it</p>
          <h2 className="mkt-h2">Doctor, AI, patient — in that order.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            Good health intelligence isn&apos;t AI replacing the clinician. It&apos;s a triangle where each
            corner does what it&apos;s best at.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Doctors lead</h3>
              <p className="mkt-muted mkt-three-p">
                The clinician decides. Every synthesis is a draft for them to approve — never an action
                taken on its own.
              </p>
            </div>
            <div>
              <h3>AI synthesizes</h3>
              <p className="mkt-muted mkt-three-p">
                It reads across the live data, surfaces what changed, and drafts the notes and talking
                points so the doctor walks in informed.
              </p>
            </div>
            <div>
              <h3>Patients own</h3>
              <p className="mkt-muted mkt-three-p">
                The record is theirs — connected from their own devices, and portable on request. They
                hold their own copy.
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
            <h2 className="mkt-h2">The clinics the big EHRs overlook.</h2>
            <p className="mkt-p">
              Mainstream EHRs were built for billing inside hospital systems. The clinics practicing
              proactive, data-driven medicine were left to improvise on spreadsheets and tools that
              don&apos;t talk to each other. We build for them.
            </p>
            <ul className="mkt-points">
              <li>Longevity and preventive medicine</li>
              <li>Functional and integrative medicine</li>
              <li>Practices that live in wearables, labs and CGM data</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-grid">
                {[
                  "Every data source, normalized",
                  "One patient picture, kept live",
                  "AI that drafts — the doctor approves",
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
                  ["Patients keep their own data", "portable"],
                  ["A clinic's data stays its own", "isolated"],
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
              We&apos;re a small team building for clinicians we listen to closely. These hold whether
              you&apos;re our first clinic or our hundredth.
            </p>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Building a clinic like this?</h2>
          <p className="mkt-lead mkt-cta-lead">
            We&apos;d like to hear how you practice. Let&apos;s talk.
          </p>
          <Link href="/contact" className="mkt-btn lg">Get in touch</Link>
        </div>
      </section>
    </>
  );
}
