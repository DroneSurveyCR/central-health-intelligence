import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For clinicians",
  description:
    "Central Health Intelligence removes the admin that eats half your day and adds intelligence no EHR has — a morning briefing, a triage worklist, and an approvals queue for AI drafts you review before anything is sent.",
};

export default function ForCliniciansPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">For clinicians</p>
            <h1 className="mkt-display">
              Less admin. More <span className="mkt-lime-underline">judgment</span>.
            </h1>
            <p className="mkt-lead">
              Clinicians spend close to half their time on administration, and most say their EHR adds
              friction to every day. Central Health Intelligence takes the admin off your plate — and
              adds a layer of intelligence no EHR has.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/platform/intelligence" className="mkt-btn ghost lg">See the intelligence layer</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A morning briefing of the day's patients with what changed since each visit">
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Morning briefing · Tue · 9 patients
              </div>
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {[
                  ["08:30", "Ken Patterson", "Sleep down, glucose drifting"],
                  ["09:15", "Dana Ruiz", "Labs back — TSH flagged"],
                  ["10:00", "Marcus Bell", "Resting HR +9 since visit"],
                ].map(([t, n, note]) => (
                  <div key={n} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", marginBottom: 3 }}>
                      <span>{t}</span><span style={{ color: "var(--green)" }}>Pre-read</span>
                    </div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{n}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mkt-wrap" style={{ marginTop: 44 }}>
          <div className="mkt-strip">
            <span><b>~50%</b> of practitioner time is admin</span>
            <span className="dot" />
            <span>Most clinicians say their <b>EHR adds daily friction</b></span>
            <span className="dot" />
            <span>CHI gives back the <b>first hour</b> of every day</span>
          </div>
        </div>
      </section>

      {/* ---- Morning briefing ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Your day, pre-read</p>
            <h2 className="mkt-h2">Walk in already knowing what changed.</h2>
            <p className="mkt-p">
              Before your first patient, CHI reads your whole day for you: a per-patient delta of what
              moved since the last visit, what needs attention, and the talking points that follow from it.
            </p>
            <ul className="mkt-points">
              <li>One briefing across every patient on the schedule</li>
              <li>Continuous data — wearables, CGM and labs — folded into each delta</li>
              <li>AI talking points drafted for review, never auto-applied</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
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
                  <strong style={{ color: "var(--green)" }}>AI draft</strong> · Talking points ready for review — sleep and glucose trend.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Alerting + triage worklist ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Triage worklist · 4 to review
              </div>
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {[
                  ["High", "Glucose over 200 for 6h", "Dana Ruiz", "#bb5234"],
                  ["Watch", "Resting HR trending up", "Marcus Bell", "var(--green)"],
                  ["Watch", "Sleep under 5h, 4 nights", "Ken Patterson", "var(--green)"],
                  ["Info", "Lab panel imported", "Ana Flores", "var(--muted)"],
                ].map(([sev, msg, who, c]) => (
                  <div key={msg} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", border: "1px solid var(--line)", borderRadius: 11 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: c, minWidth: 42 }}>{sev}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{msg}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{who}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Alerting &amp; triage</p>
            <h2 className="mkt-h2">The signal finds you — not the other way around.</h2>
            <p className="mkt-p">
              Continuous data is watched for the patterns that matter, then ranked into a single triage
              worklist. You decide what&apos;s clinically meaningful; CHI just makes sure nothing slips past.
            </p>
            <ul className="mkt-points">
              <li>Thresholds and trends across wearables, CGM and labs</li>
              <li>One ranked worklist — severity first, noise filtered out</li>
              <li>Every alert opens straight into the patient&apos;s live picture</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Approvals queue ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Approvals queue</p>
            <h2 className="mkt-h2">AI drafts the paperwork. You sign off.</h2>
            <p className="mkt-p">
              The work that eats your evenings is drafted for you and lined up in one queue. Nothing is
              sent, billed or charted until you approve it — and you can edit any draft before you do.
            </p>
            <ul className="mkt-points">
              <li>Ambient note turned into a structured SOAP draft</li>
              <li>Suggested replies to patient messages</li>
              <li>A superbill drafted from the encounter, ready to confirm</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Approvals · 3 awaiting you
              </div>
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {[
                  ["SOAP note", "Marcus Bell · from ambient visit"],
                  ["Message reply", "Dana Ruiz · re: lab results"],
                  ["Superbill", "Ken Patterson · 99214 + add-on"],
                ].map(([kind, sub]) => (
                  <div key={kind} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <strong style={{ fontSize: 14.5 }}>{kind}</strong>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green)", background: "var(--mint)", padding: "3px 9px", borderRadius: 20 }}>AI draft</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{sub}</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--muted)", paddingTop: 2 }}>
                  Approve · Edit · Dismiss on every item
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Front desk + care team ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The whole clinic, not just the chart</p>
          <h2 className="mkt-h2">A front desk and a care team, in one view.</h2>
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            Intelligence is only useful if the clinic runs on it. CHI gives the front desk its own
            board and the care team clear roles, so work moves without a huddle.
          </p>
          <div className="mkt-three">
            <div>
              <h3>Front-desk view</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Today&apos;s arrivals, check-ins, intake status and outstanding balances — the desk&apos;s own home screen.
              </p>
            </div>
            <div>
              <h3>Care-team roles</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Provider, nurse, health coach and admin each see scoped access and the right work.
              </p>
            </div>
            <div>
              <h3>Tasks that route</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Assign a follow-up, a recheck or a callback — it lands on the right person&apos;s list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Does the AI ever act on its own?", "No. Every AI output — notes, replies, superbills, talking points — lands in an approvals queue. Nothing is sent, charted or billed until a clinician approves it, and you can edit any draft first."],
              ["Is this a replacement for our EHR or an add-on?", "CHI is a full modular EHR with the intelligence layer built in. You can run the whole clinic on it, or start with the modules you need and grow."],
              ["How does the morning briefing get its data?", "From the live picture — patient-connected wearables, CGM and imported labs, reconciled against the last visit. The briefing is the per-patient delta, generated before you walk in."],
              ["Will it slow my visits down?", "It's built to do the opposite. Ambient capture drafts the note, the worklist surfaces what changed, and the front-desk view keeps the day moving — so more of the visit is the patient."],
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
          <h2 className="mkt-h2">See your day, pre-read.</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            A short demo on your specialty, with your questions.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
