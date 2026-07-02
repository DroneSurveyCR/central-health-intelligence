import Link from "next/link";
import type { Metadata } from "next";
import { Browser, Phone } from "@/components/site/Device";

export const metadata: Metadata = {
  title: "For Chiropractors — Central Health Intelligence",
  description:
    "Document the whole spine in minutes — by voice, or straight from your scanner. Per-vertebra findings, a 0–100 alignment score, and AI that drafts the plan from your own protocols.",
};

const STEPS: { title: string; body: string }[] = [
  {
    title: "Assess",
    body: "Click any vertebra from C1 to the sacrum and dictate the finding by voice — or drop in a scan. Add curves, Cobb angle, and the postural chain.",
  },
  {
    title: "Score",
    body: "Every finding rolls into one Spine Alignment Score, 0–100, that trends visit over visit — so the patient sees their alignment improve, not just hears it.",
  },
  {
    title: "Plan",
    body: "The AI drafts the care plan from your own protocols and products — you review and approve. The patient follows a clean schedule and asks the assistant their questions.",
  },
];

const DEVICES: string[] = [
  "Tytron paraspinal thermal",
  "Digital X-ray / DICOM",
  "PostureScreen posture & ROM",
  "MyoVision sEMG",
  "CLA INSiGHT CoreScore",
];

const FAQ: [string, string][] = [
  [
    "Do I need any new hardware?",
    "No. You can document the entire spine with nothing but your voice. If you already own a scanner, drop its file onto the assessment — thermal, X-ray, sEMG, posture, or a CoreScore — and it lives with the visit.",
  ],
  [
    "How does the voice part work?",
    "Click a vertebra, press dictate, and talk. It transcribes into that vertebra's note. You can correct anything before you save. No typing between patients.",
  ],
  [
    "What makes the spine view different?",
    "It's an interactive spine — 2D and 3D — where each vertebra is clickable and colour-coded by severity, plus a single alignment score that trends over time. No other chiropractic system ships this.",
  ],
  [
    "Do you handle insurance billing?",
    "We keep a clean record of it, but we don't submit claims. CHI is built for cash-pay and wellness practices that want great documentation and patient experience without the billing machinery.",
  ],
  [
    "Where does the AI get its answers?",
    "From your knowledge base — your protocols, your services, your products. It drafts; you approve. It never diagnoses, and it only answers chiropractic and spine questions.",
  ],
];

export default function ForChiropractorsPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">For chiropractors</p>
            <h1 className="mkt-display">Document the whole spine in minutes — by voice, or from your scanner.</h1>
            <p className="mkt-lead">
              Click any vertebra and dictate the finding. Attach a scan if you have one. Get a single alignment
              score that trends over time, and an AI that drafts the plan in your own words.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/product" className="mkt-btn ghost lg">How it works →</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <Browser src="bodymap-2d.png" alt="The interactive body & spine map in Central Health Intelligence" label="app.healthintelligency.com/spine" tilt />
          </div>
        </div>
      </section>

      {/* ---- Two ways in ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Two ways in</p>
          <h2 className="mkt-h2">Just talk. Or plug in what you already own.</h2>
          <div className="mkt-three">
            <div>
              <p className="mkt-kicker">Option A</p>
              <h3 className="mkt-h3">Voice notes</h3>
              <p className="mkt-muted mkt-three-p">
                No hardware at all. Click a vertebra, speak the finding, save. The whole spine documented before
                the patient is off the table.
              </p>
            </div>
            <div>
              <p className="mkt-kicker">Option B</p>
              <h3 className="mkt-h3">Your devices</h3>
              <p className="mkt-muted mkt-three-p">
                Already scanning? Drop the file onto the assessment — thermal, X-ray, sEMG, posture, or a
                CoreScore. One simple upload, any device.
              </p>
            </div>
            <div>
              <p className="mkt-kicker">Either way</p>
              <h3 className="mkt-h3">One record</h3>
              <p className="mkt-muted mkt-three-p">
                Voice, scans, curves, and the alignment score all live on one assessment, tracked visit over
                visit — progress the patient can see.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Your devices (visual) ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div className="mkt-row-media">
            <Browser src="be-scan.png" alt="A patient scan attached to the record in Central Health Intelligence" label="app.healthintelligency.com/scans" />
          </div>
          <div>
            <p className="mkt-kicker">Works with what you have</p>
            <h2 className="mkt-h2">Bring your scanner — or bring nothing but your voice.</h2>
            <ul className="mkt-points">
              {DEVICES.map((d) => (
                <li key={d}>{d}</li>
              ))}
              <li>…or no device at all — voice notes cover the full spine.</li>
            </ul>
            <p className="mkt-p">
              Files attach in one step and stay on the visit, tied to the assessment and the plan.
            </p>
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How it works</p>
          <h2 className="mkt-h2">Assess → score → plan.</h2>
          <div className="mkt-three">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <p className="mkt-kicker">Step {i + 1}</p>
                <h3 className="mkt-h3">{s.title}</h3>
                <p className="mkt-muted mkt-three-p">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Progress the patient sees (visual) ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Browser src="fe-before-after.png" alt="Before-and-after progress a patient can see" label="app.healthintelligency.com/progress" />
          </div>
          <div>
            <p className="mkt-kicker">Progress they can see</p>
            <h2 className="mkt-h2">One alignment score, trending the right way.</h2>
            <p className="mkt-p">
              Every finding rolls into a single 0–100 score that moves visit over visit. A patient going from
              “fair” to “good” doesn’t just hear it — they watch the line climb. That’s what re-books care.
            </p>
            <div className="mkt-action">
              <Link href="/product" className="mkt-btn ghost">See the full flow</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- AI drafts the plan (visual) ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div className="mkt-row-media">
            <Browser src="be-plan-builder.png" alt="The AI-drafted plan a doctor reviews and approves" label="app.healthintelligency.com/plan" />
          </div>
          <div>
            <p className="mkt-kicker">AI in your words</p>
            <h2 className="mkt-h2">The AI drafts. You approve.</h2>
            <p className="mkt-p">
              It writes the plan and the notes from <em>your</em> protocols, services, and products — so a draft
              reads like your clinic, not a generic template. Nothing reaches the patient until you sign off, and
              it never diagnoses.
            </p>
          </div>
        </div>
      </section>

      {/* ---- What's different + patient app ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Phone src="fe-assistant.png" alt="The patient's AI assistant on their phone" tilt />
          </div>
          <div>
            <p className="mkt-kicker">Why it&apos;s different</p>
            <h2 className="mkt-h2">The things no other chiropractic system has.</h2>
            <ul className="mkt-points">
              <li>An interactive 2D + 3D spine, clickable vertebra by vertebra.</li>
              <li>A 0–100 Spine Alignment Score that trends over time.</li>
              <li>Voice dictation straight onto each vertebra.</li>
              <li>An AI the patient can ask — grounded in your protocols, so it stops filling your inbox.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Questions, answered.</h2>
          <div className="mkt-faq">
            {FAQ.map(([q, a]) => (
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
          <h2 className="mkt-h2">See the spine assessment on your patients.</h2>
          <p className="mkt-lead mkt-cta-lead">A short demo, your workflow, your questions.</p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
