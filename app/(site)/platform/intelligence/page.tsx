import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intelligence layer",
  description:
    "A per-patient morning briefing of what changed since the last visit, an alerts engine with a triage worklist and alert-fatigue tuning, and AI-drafted talking points the doctor reviews — built on a nightly delta.",
};

const DELTA_ROWS: [string, string, "down" | "up" | "flat"][] = [
  ["HRV", "−18 ms", "down"],
  ["Glucose, time in range", "−12%", "down"],
  ["Sleep", "−1.4 h / night", "down"],
  ["Weight", "+1.6 kg", "up"],
  ["Med adherence", "94%", "flat"],
];

const NIGHTLY_STATS: [string, string][] = [
  ["Read new readings", "11,408 points"],
  ["Computed deltas vs. last visit", "142 patients"],
  ["Flagged for review", "9"],
  ["Drafted talking points", "9"],
];

const TRIAGE_ROWS: [string, "high" | "watch" | "routine", string, string][] = [
  ["Urgent", "high", "Marlene O. · glucose excursion", "now"],
  ["Urgent", "high", "David R. · resting HR +14 bpm", "now"],
  ["Watch", "watch", "Ken P. · sleep regression", "today"],
  ["Watch", "watch", "Aria S. · weight trend", "today"],
  ["Routine", "routine", "Tomas L. · labs due", "this week"],
];

const TALKING_POINTS = [
  "Sleep down 1.4 h/night for two weeks — ask about evening routine and travel.",
  "Glucose time-in-range slipping — revisit dinner timing before adjusting the plan.",
  "HRV trending down with the above — likely linked, worth naming together.",
];

export default function IntelligencePage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">The intelligence layer</p>
            <h1 className="mkt-display">
              Walk in already <span className="mkt-lime-underline">knowing</span>.
            </h1>
            <p className="mkt-lead">
              Each night the system reads every patient&apos;s incoming data and computes what moved since
              their last visit. By morning, each chart opens to a short briefing — and only what&apos;s urgent
              ever interrupts your day.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/platform/connectors" className="mkt-btn ghost lg">Where the data comes from</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A morning briefing showing what changed for one patient since their last visit">
              <div className="mkt-briefing-bar">Morning briefing · since last visit</div>
              <div className="mkt-briefing-body">
                <div className="mkt-briefing-name">Ken Patterson</div>
                <div className="mkt-briefing-sub">11 days · 5 sources</div>
                {DELTA_ROWS.map(([k, v, dir]) => (
                  <div key={k} className="mkt-briefing-row">
                    <span>{k}</span>
                    <strong className={dir === "down" ? "mkt-stat-val red" : "mkt-stat-val ink"}>{v}</strong>
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

      {/* ---- The nightly delta ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-briefing-body">
                <div className="mkt-device-subhead">Last night · 02:14 · 142 patients</div>
                {NIGHTLY_STATS.map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-stat-val green">● {v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Built on a nightly delta</p>
            <h2 className="mkt-h2">A quiet computation, before you arrive.</h2>
            <p className="mkt-p">
              Every night the engine compares each patient&apos;s latest readings to their state at the last
              visit. The briefing is the readable summary of that delta — no dashboards to assemble, no
              tabs to reconcile.
            </p>
            <ul className="mkt-points">
              <li>Deltas across HRV, glucose, sleep, weight and adherence</li>
              <li>Per-visit baselines, so the comparison is clinically meaningful</li>
              <li>Recomputed nightly — the picture is never more than a day old</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Alerts + triage worklist ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Alerts &amp; the triage worklist</p>
            <h2 className="mkt-h2">One worklist, ordered by severity.</h2>
            <p className="mkt-p">
              The alerts engine turns the nightly delta into a{" "}
              <code className="mkt-code-accent">/triage</code>{" "}
              worklist — patients sorted into severity tiers so the team works the most important cases first,
              not the most recent.
            </p>
            <ul className="mkt-points">
              <li>Urgent, watch and routine tiers, each with a clear next action</li>
              <li>Shared across the care team, with ownership and status</li>
              <li>Closes the loop — every alert is reviewed, deferred or resolved</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-bar">/triage · 9 to review</div>
              <div className="mkt-mock-grid">
                {TRIAGE_ROWS.map(([tier, sev, who, when], i) => (
                  <div key={i} className="mkt-alert-item">
                    <span className={`mkt-tier ${sev}`}>{tier}</span>
                    <span className="mkt-alert-who">{who}</span>
                    <span className="mkt-alert-when">{when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Alert-fatigue tuning ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Tuned against alert fatigue</p>
          <h2 className="mkt-h2">Only the urgent ones interrupt.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            An alerting system that cries wolf gets muted. Severity thresholds are set per clinic, so the
            briefing stays quiet and the interruptions stay meaningful.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Urgent interrupts</h3>
              <p className="mkt-muted mkt-three-p">
                A small, deliberate set of conditions can break through in real time. Everything else waits
                for the morning briefing.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Thresholds you set</h3>
              <p className="mkt-muted mkt-three-p">
                Tune what counts as a meaningful change per metric and per clinic — your population, your bar.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Quiet by default</h3>
              <p className="mkt-muted mkt-three-p">
                Routine drift is summarized, not pushed. The team trusts the alert because it&apos;s rare.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- AI-drafted talking points ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-bar">Talking points · draft for review</div>
              <div className="mkt-chat">
                {TALKING_POINTS.map((t) => (
                  <div key={t} className="mkt-item">{t}</div>
                ))}
                <div className="mkt-action-row">
                  <span className="mkt-action-btn accent">Approve</span>
                  <span className="mkt-action-btn">Edit</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">AI-drafted, doctor-reviewed</p>
            <h2 className="mkt-h2">Talking points you read, then own.</h2>
            <p className="mkt-p">
              For each flagged patient the system drafts a few specific talking points from their own data —
              a starting place for the conversation. They&apos;re a draft until you review them; nothing is
              decided for you.
            </p>
            <div className="mkt-action">
              <Link href="/platform/ai" className="mkt-btn ghost">How the approval queue works</Link>
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
              ["What exactly is in the briefing?", "A per-patient delta of what changed since the last visit — HRV, glucose, sleep, weight and adherence — plus any flags and AI-drafted talking points for review."],
              ["How does triage decide severity?", "The alerts engine maps each change against thresholds you set per metric and per clinic, then sorts patients into urgent, watch and routine tiers on the /triage worklist."],
              ["Will it bury us in alerts?", "No. Only a small, deliberate set of urgent conditions interrupts in real time. Routine drift is summarized in the morning briefing, never pushed."],
              ["Does the AI change the record?", "No. Talking points are a draft. They become part of the visit only when a clinician reviews and approves them."],
              ["How fresh is the data?", "The delta is recomputed nightly, so each morning's briefing reflects everything synced up to the night before."],
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
          <h2 className="mkt-h2">See your morning briefing.</h2>
          <p className="mkt-lead mkt-cta-lead">
            A short demo on a sample panel, in your specialty.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
