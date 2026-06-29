import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Try the demo",
  description: "See Central Health Intelligence in action — a demo practice with clients on AI-drafted, doctor-approved 90-day plans, and the client app. No signup required.",
};

export default function DemoPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-demo-hero">
          <p className="mkt-kicker">No signup required</p>
          <h1 className="mkt-display mkt-demo-display">
            See CHI with real data.
          </h1>
          <p className="mkt-lead">
            A fully loaded demo practice — clients on AI-drafted, doctor-approved 90-day plans, with the
            client app and progress tracking on both sides. Click in and explore.
          </p>
          <div className="mkt-hero-cta center">
            <a href="/api/demo" className="mkt-btn lg">Enter demo →</a>
            <Link href="/contact" className="mkt-btn ghost lg">Book a real demo</Link>
          </div>
          <p className="mkt-demo-fine">
            Demo data resets daily · no real PHI
          </p>
        </div>
      </section>

      {/* ---- What you'll see ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-demo-h2">What you&apos;ll find inside.</h2>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Upload → simple visual</h3>
              <p className="mkt-muted mkt-three-p">
                A client&apos;s uploaded scans and labs, turned into a clean visual they can explore in
                plain language.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">AI drafts, doctor approves</h3>
              <p className="mkt-muted mkt-three-p">
                A 90-day plan and the notes, drafted by AI and waiting in the approvals queue. Approve,
                edit or reject — nothing reaches the client without your sign-off.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">The client app</h3>
              <p className="mkt-muted mkt-three-p">
                A clean daily schedule and an AI assistant that answers the client&apos;s questions about
                their plan — so they&apos;re not messaging you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Demo client preview ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Try it on Ken Patterson</p>
            <h2 className="mkt-h2">A 90-day plan, already drafted.</h2>
            <p className="mkt-p">
              Ken is a 58-year-old longevity client. From his uploaded labs and scan, CHI drafted a
              phased 90-day plan — supplements, training and habits on a schedule. Review it, adjust it,
              approve it, and it&apos;s live in his app.
            </p>
            <ul className="mkt-points">
              <li>A phased plan built from Ken&apos;s own data</li>
              <li>AI-drafted, waiting for your review</li>
              <li>One-click approve → live in the client app</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="Ken Patterson 90-day plan">
              <div className="mkt-briefing-bar">
                90-day plan · Ken Patterson
              </div>
              <div className="mkt-briefing-body">
                <div className="mkt-briefing-name">Phase 1 · Stabilize</div>
                <div className="mkt-briefing-sub">Days 1–30</div>
                {[
                  ["Magnesium glycinate", "400mg · nightly"],
                  ["Vitamin D3 + K2", "5000 IU · daily"],
                  ["Zone 2 cardio", "3× / week"],
                  ["Sleep window", "10:30pm · nightly"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-briefing-row">
                    <span>{k}</span>
                    <strong className="mkt-val-up">{v}</strong>
                  </div>
                ))}
                <div className="mkt-briefing-draft">
                  <strong className="mkt-draft-label">AI draft</strong> · Plan ready for your review and approval.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Ready to see it?</h2>
          <p className="mkt-lead mkt-demo-cta-lead">
            One click. No account needed.
          </p>
          <a href="/api/demo" className="mkt-btn lg">Enter demo →</a>
        </div>
      </section>
    </>
  );
}
