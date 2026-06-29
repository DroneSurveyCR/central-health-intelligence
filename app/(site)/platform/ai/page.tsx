import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI that drafts",
  description:
    "AI drafts SOAP notes from voice, message replies, clinical narratives and scan synthesis — every output lands in an approval queue. Approval is the only thing that writes to the record. Grounded on the patient's own data, PHI-safe.",
};

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
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Approval queue · 6 drafts
              </div>
              <div style={{ padding: 16, display: "grid", gap: 10 }}>
                {[
                  ["SOAP note", "Ken Patterson · from voice"],
                  ["Message reply", "Aria Solberg · sleep question"],
                  ["Clinical narrative", "David Reyes · quarterly"],
                  ["Scan synthesis", "Marlene Ortiz · DEXA"],
                ].map(([kind, who]) => (
                  <div key={String(who)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", border: "1px solid var(--line)", borderRadius: 11 }}>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{kind}</span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)" }}>{who}</span>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green)" }}>Draft</span>
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
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            The AI handles the writing that fills a clinical day — and stops at the draft, every time.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">SOAP notes from voice</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Speak through the visit; get a structured SOAP draft to review, not a blank note to write.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Message replies</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Patient asks a question; a grounded reply is drafted in the thread, ready for a quick read
                and send.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Clinical narratives</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Quarterly summaries and referral letters, composed from the record and the live data.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Scan &amp; data synthesis</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Labs, scans and wearable trends pulled into one readable picture — the synthesis, drafted.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Talking points</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                From the morning briefing — a few specific things worth raising, for the doctor to confirm.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Always a draft</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
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
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                SOAP draft · Ken Patterson
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["S", "Reports lighter sleep over two weeks; travel-related."],
                  ["O", "HRV −18 ms; glucose time-in-range −12% vs. last visit."],
                  ["A", "Likely sleep-driven metabolic drift; no acute concern."],
                  ["P", "Adjust evening routine; recheck in 3 weeks."],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
                    <strong style={{ color: "var(--green)", minWidth: 16 }}>{k}</strong>
                    <span style={{ color: "var(--ink-2)" }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: "var(--green)", padding: "8px 14px", borderRadius: 9 }}>Approve &amp; sign</span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 9 }}>Edit</span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 9 }}>Discard</span>
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
            <div style={{ marginTop: 24 }}>
              <Link href="/trust" className="mkt-btn ghost">Read the security model</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>This draft was grounded on</div>
                {[
                  ["Patient record", "Ken Patterson only"],
                  ["Oura · sleep, HRV", "last 14 days"],
                  ["Dexcom · glucose", "last 14 days"],
                  ["Visit history", "since last SOAP"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{k}</span>
                    <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: "11px 13px", background: "var(--mint)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, color: "var(--ink-2)" }}>
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
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Questions, answered.</h2>
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
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            A short demo — draft, review, approve, on your own workflow.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
