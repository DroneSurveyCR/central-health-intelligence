import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Try the demo",
  description: "See Central Health Intelligence in action — a live demo loaded with realistic patients, wearable data, and AI-drafted notes. No signup required.",
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
            A fully loaded demo clinic — 6 patients, 30 days of wearable data, morning briefings, AI drafts
            waiting for approval. Click in and explore.
          </p>
          <div className="mkt-hero-cta center">
            <a href="/api/demo" className="mkt-btn lg">Enter demo →</a>
            <Link href="/contact" className="mkt-btn ghost lg">Book a real demo</Link>
          </div>
          <p className="mkt-demo-fine">
            Demo data resets daily · read-only wearable syncs · no real PHI
          </p>
        </div>
      </section>

      {/* ---- What you'll see ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-demo-h2">What you&apos;ll find inside.</h2>
          <div className="mkt-three">
            <div>
              <h3>Morning briefing</h3>
              <p className="mkt-muted mkt-three-p">
                6 patients pre-loaded with today&apos;s delta — what changed since their last visit,
                what needs attention. Ken Patterson&apos;s sleep regression is already flagged.
              </p>
            </div>
            <div>
              <h3>AI drafts, doctor approves</h3>
              <p className="mkt-muted mkt-three-p">
                SOAP notes and patient messages drafted and waiting in the approvals queue.
                Approve, edit, or reject — nothing sends without your sign-off.
              </p>
            </div>
            <div>
              <h3>Live wearable data</h3>
              <p className="mkt-muted mkt-three-p">
                Oura, Garmin, Dexcom CGM, Withings and Apple Health — 30 days of normalized
                data in one view per patient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Demo patient preview ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Try it on Ken Patterson</p>
            <h2 className="mkt-h2">A morning briefing that already did the work.</h2>
            <p className="mkt-p">
              Ken is a 58-year-old longevity patient. Since his last visit 11 days ago his sleep
              dropped 1.4 h/night, resting HR climbed 9 bpm, and glucose time-in-range fell 12%.
              CHI caught it before you walked in.
            </p>
            <ul className="mkt-points">
              <li>Sleep regression visible across Oura + CGM together</li>
              <li>AI-drafted talking points waiting for your review</li>
              <li>One-click approve → ready to paste into your notes</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="Ken Patterson morning briefing">
              <div className="mkt-briefing-bar">
                Morning briefing · today
              </div>
              <div className="mkt-briefing-body">
                <div className="mkt-briefing-name">Ken Patterson</div>
                <div className="mkt-briefing-sub">Since last visit · 11 days</div>
                {[
                  ["Resting HR", "+9 bpm", "up"],
                  ["Sleep", "−1.4 h / night", "down"],
                  ["Glucose, time in range", "−12%", "down"],
                ].map(([k, v, dir]) => (
                  <div key={k} className="mkt-briefing-row">
                    <span>{k}</span>
                    <strong className={dir === "down" ? "mkt-val-down" : "mkt-val-up"}>{v}</strong>
                  </div>
                ))}
                <div className="mkt-briefing-draft">
                  <strong className="mkt-draft-label">AI draft</strong> · Talking points ready — sleep regression and glucose trend.
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
