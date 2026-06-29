import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI that drafts",
  description:
    "AI drafts SOAP notes from voice, message replies, clinical narratives and scan synthesis — every output lands in an approval queue. Approval is the only thing that writes to the record. Grounded on the patient's own data, PHI-safe.",
};

const QUEUE_ITEMS: [string, string][] = [
  ["SOAP note", "Ken Patterson · from voice"],
  ["Message reply", "Aria Solberg · sleep question"],
  ["Clinical narrative", "David Reyes · quarterly"],
  ["Scan synthesis", "Marlene Ortiz · DEXA"],
];

const SOAP_ROWS: [string, string][] = [
  ["S", "Reports lighter sleep over two weeks; travel-related."],
  ["O", "HRV −18 ms; glucose time-in-range −12% vs. last visit."],
  ["A", "Likely sleep-driven metabolic drift; no acute concern."],
  ["P", "Adjust evening routine; recheck in 3 weeks."],
];

const GROUNDING_ROWS: [string, string][] = [
  ["Patient record", "Ken Patterson only"],
  ["Oura · sleep, HRV", "last 14 days"],
  ["Dexcom · glucose", "last 14 days"],
  ["Visit history", "since last SOAP"],
];

export default function AiPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">AI that drafts</p>
            <h1 className="mkt-display">
              The AI drafts. The doctor <span className="mkt-lime-underline">approves</span>.
            </h1>
            <p className="mkt-lead">
              Every AI output is a draft in a queue. A clinician reviews it, edits it, and approves it —
              and approval is the only thing that writes to the record. Nothing is ever applied on its own.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/trust" className="mkt-btn ghost lg">How we handle PHI</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="An approval queue of AI-drafted clinical outputs awaiting a clinician's review">
              <div className="mkt-mock-bar">Approval queue · 6 drafts</div>
              <div className="mkt-mock-grid">
                {QUEUE_ITEMS.map(([kind, who]) => (
                  <div key={who} className="mkt-approval-item">
                    <div className="mkt-approval-head">
                      <span className="mkt-approval-kind">{kind}</span>
                      <span className="mkt-draft-tag">Draft</span>
                    </div>
                    <div className="mkt-approval-sub">{who}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- What it drafts ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">What it drafts</p>
          <h2 className="mkt-h2">Four kinds of output. One rule.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            The AI handles the writing that fills a clinical day — and stops at the draft, every time.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">SOAP notes from voice</h3>
              <p className="mkt-muted mkt-three-p">
                Speak through the visit; get a structured SOAP draft to review, not a blank note to write.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Message replies</h3>
              <p className="mkt-muted mkt-three-p">
                Patient asks a question; a grounded reply is drafted in the thread, ready for a quick read
                and send.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Clinical narratives</h3>
              <p className="mkt-muted mkt-three-p">
                Quarterly summaries and referral letters, composed from the record and the live data.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Scan &amp; data synthesis</h3>
              <p className="mkt-muted mkt-three-p">
                Labs, scans and wearable trends pulled into one readable picture — the synthesis, drafted.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Talking points</h3>
              <p className="mkt-muted mkt-three-p">
                From the morning briefing — a few specific things worth raising, for the doctor to confirm.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Always a draft</h3>
              <p className="mkt-muted mkt-three-p">
                Whatever the type, it lands in the queue first — never in the chart on its own.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- The approval queue ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-mock-bar">SOAP draft · Ken Patterson</div>
              <div className="mkt-briefing-body">
                {SOAP_ROWS.map(([k, v]) => (
                  <div key={k} className="mkt-soap-row">
                    <strong className="mkt-soap-key">{k}</strong>
                    <span className="mkt-soap-val">{v}</span>
                  </div>
                ))}
                <div className="mkt-action-row">
                  <span className="mkt-action-btn filled">Approve &amp; sign</span>
                  <span className="mkt-action-btn">Edit</span>
                  <span className="mkt-action-btn">Discard</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">The approval queue</p>
            <h2 className="mkt-h2">Approval is the only thing that writes.</h2>
            <p className="mkt-p">
              Drafts wait in a queue until a clinician acts on them. Approve to commit, edit to change the
              wording first, or discard. There is no path where AI text reaches the record without a person
              signing off.
            </p>
            <ul className="mkt-points">
              <li>Nothing is auto-applied — a human approval is required to write</li>
              <li>Edit before approving; your wording, your judgment</li>
              <li>Every approval is attributed and recorded in the audit trail</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Grounding + PHI safety ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Grounded &amp; PHI-safe</p>
            <h2 className="mkt-h2">Drawn from one patient&apos;s own data.</h2>
            <p className="mkt-p">
              Drafts are grounded in the specific patient&apos;s record and live signals — not generic
              guidance and not another patient&apos;s history. PHI stays inside the tenant boundary, and the
              connector data behind each draft is traceable.
            </p>
            <div className="mkt-action">
              <Link href="/trust" className="mkt-btn ghost">Read the security model</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div className="mkt-briefing-body">
                <div className="mkt-device-subhead">This draft was grounded on</div>
                {GROUNDING_ROWS.map(([k, v]) => (
                  <div key={k} className="mkt-stat">
                    <span>{k}</span>
                    <span className="mkt-alert-when">{v}</span>
                  </div>
                ))}
                <div className="mkt-briefing-note">
                  Scoped to this tenant · no cross-patient context
                </div>
              </div>
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
              ["Can the AI write to the record on its own?", "No. Every output is a draft. The record changes only when a clinician approves it — approval is the single path that writes."],
              ["What can it draft?", "SOAP notes from voice, patient message replies, clinical narratives like summaries and referral letters, and synthesis of scans and wearable data."],
              ["What is it grounded on?", "The individual patient's own record and live connector data. It does not pull in other patients' information."],
              ["Is patient data kept private?", "Yes. PHI stays within the tenant boundary, drafts are scoped to one patient, and the data behind each draft is traceable."],
              ["Is every approval tracked?", "Yes. Each approval is attributed to the clinician who signed it and recorded in the audit trail."],
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
          <h2 className="mkt-h2">See the approval queue in motion.</h2>
          <p className="mkt-lead mkt-cta-lead">
            A short demo — draft, review, approve, on your own workflow.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
