import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modular EHR core",
  description:
    "The clinical core: patients, intake, SOAP and visits, scheduling, messaging, care team and tasks, and a front desk — plus a module system where each clinic enables only the verticals it needs.",
};

export default function EhrPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">The modular EHR core</p>
            <h1 className="mkt-display">
              The clinical core, <span className="mkt-lime-underline">nothing</span> spare.
            </h1>
            <p className="mkt-lead">
              Patients, intake, visits, scheduling, messaging, tasks and a front desk — the work every clinic
              does — with a module system that turns on only the verticals you actually run.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/modules" className="mkt-btn ghost lg">Browse the modules</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A patient chart showing intake, the latest visit, schedule and open tasks">
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Chart · Aria Solberg
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["Intake", "Complete · reviewed"],
                  ["Last visit", "SOAP signed · 9 days ago"],
                  ["Next appointment", "Tue 10:30 · follow-up"],
                  ["Open tasks", "2 · care team"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: "11px 13px", background: "var(--mint-2)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, color: "var(--ink-2)" }}>
                  Messaging open · 1 unread from patient
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- The core ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">What every clinic gets</p>
          <h2 className="mkt-h2">The whole clinical workflow, in one place.</h2>
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            The core is the part no clinic can skip — and the part legacy EHRs make heavy. Here it stays light.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Patients &amp; intake</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                A clean patient record and structured intake that flows straight into the chart.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">SOAP &amp; visits</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Structured visit notes and history — drafted by AI, signed by the clinician.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Scheduling</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Appointments, follow-ups and provider calendars without a separate booking tool.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Messaging</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Secure patient threads in the chart, with AI-drafted replies awaiting approval.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Care team &amp; tasks</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Shared ownership, assignable tasks and clear handoffs across the team.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Front desk</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                A check-in and front-of-house view that keeps the day moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- The module system ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Modules · enabled for this clinic
              </div>
              <div style={{ padding: 16 }}>
                {[
                  ["Longevity", true],
                  ["Peptide therapy", true],
                  ["HRT", true],
                  ["GLP-1 weight", false],
                  ["KAP / plant medicine", false],
                  ["Dispensary", true],
                ].map(([name, on]) => (
                  <div key={String(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: on ? "var(--green)" : "var(--muted)" }}>
                      {on ? "● On" : "○ Off"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">The module system</p>
            <h2 className="mkt-h2">Turn on only what you run.</h2>
            <p className="mkt-p">
              The core stays the same for everyone. On top of it, each clinic enables the verticals it
              practices — and leaves the rest off, so the product fits the clinic instead of the other way
              around.
            </p>
            <ul className="mkt-points">
              <li>Enable verticals per clinic; the rest stay out of the way</li>
              <li>Add a module as the practice grows, without a migration</li>
              <li>Same record, same login — modules extend it, never fork it</li>
            </ul>
            <div style={{ marginTop: 24 }}>
              <Link href="/modules" className="mkt-btn ghost">See all modules</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Light to run ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Why it stays light</p>
          <h2 className="mkt-h2">A core that fits the clinic.</h2>
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            Most EHRs hand every clinic the same heavy surface. Here the surface is the core plus your
            modules — nothing you don&apos;t use.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Nothing spare</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Disabled modules don&apos;t clutter the chart, the nav or the training.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Live in days</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                A focused core means a short setup — not a multi-month implementation.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Grows with you</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Switch on a vertical when you add it; the record and the team carry over.
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
              ["What's in the core?", "Patients, intake, SOAP and visits, scheduling, messaging, care team and tasks, and a front desk — the workflow every clinic shares."],
              ["What are modules?", "Specialty verticals that sit on top of the core. Each clinic enables only the ones it practices and leaves the rest off."],
              ["Can we add a module later?", "Yes. Enable a vertical when you start offering it — no migration, and the same record and team carry over."],
              ["Do disabled modules add clutter?", "No. Modules you haven't enabled stay out of the chart, the navigation and your team's training."],
              ["Where can I see the modules?", "On the modules page, which lists the available verticals and what each adds."],
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
          <h2 className="mkt-h2">See the core, set up for your clinic.</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            A short demo with the modules you&apos;d actually turn on.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
