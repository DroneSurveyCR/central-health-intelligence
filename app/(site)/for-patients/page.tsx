import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For patients",
  description:
    "Personal Health Intelligence: connect your own wearables and labs in one tap, ask a grounded AI assistant about your trends, log daily with streaks and milestones, and own a full portable export of your data on request.",
};

export default function ForPatientsPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Personal Health Intelligence</p>
            <h1 className="mkt-display">
              Your health, finally in <span className="mkt-lime-underline">your</span> hands.
            </h1>
            <p className="mkt-lead">
              Connect your own devices and labs, see your trends in plain language, and keep a copy that
              is genuinely yours. Personal Health Intelligence is the patient side of the same live
              picture your clinic works from.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Ask your clinic about CHI</Link>
              <Link href="/trust" className="mkt-btn ghost lg">How your data is protected</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A patient's connected devices and a grounded AI assistant explaining a recent trend">
              <div className="mkt-mock-bar">Your health · this week</div>
              <div className="mkt-mock-body">
                {[
                  ["Oura", "synced 2m ago"],
                  ["Apple Health", "live"],
                  ["Quest labs", "2 panels"],
                ].map(([k, v]) => (
                  <div key={k} className="mkt-connector-row">
                    <span>{k}</span>
                    <span className="mkt-connector-state on">● {v}</span>
                  </div>
                ))}
                <div className="mkt-briefing-draft">
                  <strong className="mkt-draft-label">Assistant</strong> · Your sleep is up 40 min this week. I&apos;ll flag the lab question for your care team.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- One-tap connect ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">One tap to connect</p>
            <h2 className="mkt-h2">Bring your own devices and labs.</h2>
            <p className="mkt-p">
              Link the things you already use — your watch, your ring, your scale, your CGM, your lab
              results — in a single tap. From then on your numbers flow in on their own.
            </p>
            <ul className="mkt-points">
              <li>Oura, Apple Health, Garmin, Withings, Dexcom and more</li>
              <li>Lab results imported and turned into clear trends</li>
              <li>Connect or disconnect any source whenever you want</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-grid">
                {[
                  ["Oura ring", true],
                  ["Apple Health", true],
                  ["Withings scale", false],
                  ["Dexcom CGM", false],
                ].map(([k, on]) => (
                  <div key={String(k)} className="mkt-item-row">
                    <span>{k}</span>
                    <span className={`mkt-connector-state ${on ? "on" : "off"}`}>
                      {on ? "● Connected" : "Connect →"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Grounded AI assistant ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-chat">
                <div className="mkt-chat-q">
                  What does my latest A1c mean?
                </div>
                <div className="mkt-chat-a">
                  Your A1c is 5.4% — in the typical range, and down slightly from last time. I can explain the
                  trend, but your care team makes any clinical decisions. Want me to add a question for them?
                </div>
                <div className="mkt-chat-fine">
                  Educational only · never diagnoses or doses · defers to your clinic
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">A grounded assistant</p>
            <h2 className="mkt-h2">Understand your numbers — safely.</h2>
            <p className="mkt-p">
              Ask about a lab value or a trend and get a clear, plain-language explanation grounded in
              your own data. It&apos;s built to be safe: it never diagnoses, never doses, and always defers
              to your clinic for anything clinical.
            </p>
            <ul className="mkt-points">
              <li>Explains your labs and trends in plain language</li>
              <li>Never diagnoses, never prescribes or adjusts a dose</li>
              <li>Hands clinical questions to your care team, not to you</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Daily logging + streaks ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Daily logging</p>
            <h2 className="mkt-h2">Small habits, visible progress.</h2>
            <p className="mkt-p">
              Log how you slept, moved, ate and felt in seconds. Streaks and milestones make the routine
              stick — and give your clinic context the devices alone can&apos;t.
            </p>
            <ul className="mkt-points">
              <li>Quick daily check-ins for sleep, energy, mood and meals</li>
              <li>Streaks that reward consistency, not perfection</li>
              <li>Milestones that mark real progress over time</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-body">
                <div className="mkt-streak-header">
                  <span className="mkt-streak-title">Daily check-in</span>
                  <span className="mkt-streak-label">14-day streak</span>
                </div>
                <div className="mkt-streak-bar">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className={`mkt-streak-pip${i === 13 ? " empty" : ""}`} />
                  ))}
                </div>
                {[
                  ["30 nights of 7h+ sleep", "Milestone"],
                  ["First lab panel synced", "Milestone"],
                ].map(([label, tag]) => (
                  <div key={label} className="mkt-milestone-row">
                    <span>{label}</span>
                    <span className="mkt-milestone-tag">{tag} ✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Ownership + consent ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">You own it</p>
          <h2 className="mkt-h2">Your data is yours — to keep, and to take.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            Personal Health Intelligence is built on the idea that the record belongs to you. You decide
            what is shared, and you can take a complete copy with you at any time.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Full portable export</h3>
              <p className="mkt-muted mkt-three-p">
                Request a complete, portable copy of your record in a standard format — your right under GDPR Article 20.
              </p>
            </div>
            <div>
              <h3>Per-domain consent</h3>
              <p className="mkt-muted mkt-three-p">
                Control sharing by domain — wearables, labs, notes — and turn any of it off without losing the rest.
              </p>
            </div>
            <div>
              <h3>Always reversible</h3>
              <p className="mkt-muted mkt-three-p">
                Disconnect a source or withdraw consent whenever you choose. Nothing is locked in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Can the assistant diagnose me or change my meds?", "No. It explains your labs and trends in plain language for education only. It never diagnoses, never doses, and defers any clinical decision to your care team."],
              ["How do I get a copy of my data?", "Request a full, portable export at any time. You receive a complete copy of your record in a standard format — your right under GDPR Article 20 — and you can take it anywhere."],
              ["Who can see what I connect?", "You do, by default. Sharing is controlled per domain — wearables, labs, notes — so you choose what your clinic sees, and you can change it whenever you like."],
              ["Do I need special hardware?", "No. Connect the devices and apps you already use in one tap, or simply log your day by hand. Both feed the same picture."],
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
          <h2 className="mkt-h2">Bring Personal Health Intelligence to your care.</h2>
          <p className="mkt-lead mkt-cta-lead">
            Ask your clinic about Central Health Intelligence — or talk to us directly.
          </p>
          <Link href="/contact" className="mkt-btn lg">Get in touch</Link>
        </div>
      </section>
    </>
  );
}
