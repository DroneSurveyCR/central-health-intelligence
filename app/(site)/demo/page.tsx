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
        <div className="mkt-wrap" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          <p className="mkt-kicker">No signup required</p>
          <h1 className="mkt-display" style={{ fontSize: "clamp(2.2rem, 5vw, 3.2rem)" }}>
            See CHI with real data.
          </h1>
          <p className="mkt-lead">
            A fully loaded demo clinic — 6 patients, 30 days of wearable data, morning briefings, AI drafts
            waiting for approval. Click in and explore.
          </p>
          <div className="mkt-hero-cta" style={{ justifyContent: "center", marginTop: 28 }}>
            <a href="/api/demo" className="mkt-btn lg">Enter demo →</a>
            <Link href="/contact" className="mkt-btn ghost lg">Book a real demo</Link>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}>
            Demo data resets daily · read-only wearable syncs · no real PHI
          </p>
        </div>
      </section>

      {/* ---- What you'll see ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 36 }}>What you&apos;ll find inside.</h2>
          <div className="mkt-three">
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>☀️</div>
              <h3>Morning briefing</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                6 patients pre-loaded with today&apos;s delta — what changed since their last visit,
                what needs attention. Ken Patterson&apos;s sleep regression is already flagged.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
              <h3>AI drafts, doctor approves</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                SOAP notes and patient messages drafted and waiting in the approvals queue.
                Approve, edit, or reject — nothing sends without your sign-off.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
              <h3>Live wearable data</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
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
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Morning briefing · today
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 19, marginBottom: 2 }}>Ken Patterson</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Since last visit · 11 days</div>
                {[
                  ["Resting HR", "+9 bpm", "up"],
                  ["Sleep", "−1.4 h / night", "down"],
                  ["Glucose, time in range", "−12%", "down"],
                ].map(([k, v, dir]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{k}</span>
                    <strong style={{ color: dir === "down" ? "#bb5234" : "var(--ink)" }}>{v}</strong>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: "11px 13px", background: "var(--mint-2)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5, color: "var(--ink-2)" }}>
                  <strong style={{ color: "var(--green)" }}>AI draft</strong> · Talking points ready — sleep regression and glucose trend.
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
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            One click. No account needed.
          </p>
          <a href="/api/demo" className="mkt-btn lg">Enter demo →</a>
        </div>
      </section>
    </>
  );
}
