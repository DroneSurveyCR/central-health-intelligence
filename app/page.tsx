import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPractitioner, getCurrentPatient } from "@/lib/auth/roles";
import SiteShell from "@/components/site/SiteShell";

const SCREENS = "/screens";

export const metadata: Metadata = {
  title: { absolute: "Central Health Intelligence — a clear 90-day plan for every client" },
  description:
    "Upload your client's data, we turn it into a simple visual, AI drafts the 90-day plan you approve, and you both track progress every session. For longevity, functional-medicine and integrative practices. By Health Intelligency.",
};

/** A clean browser window around a desktop screenshot. */
function Browser({ src, alt, label, tilt }: { src: string; alt: string; label?: string; tilt?: boolean }) {
  return (
    <div className={`mkt-screen${tilt ? " tilt" : ""}`}>
      <div className="mkt-screen-bar">
        {label ? <span className="mkt-screen-url">{label}</span> : null}
      </div>
      <img src={`${SCREENS}/${src}`} alt={alt} width={1440} height={900} />
    </div>
  );
}

/** An iPhone whose screen scrolls on hover so the whole screen can be read. */
function Phone({ src, alt, tilt }: { src: string; alt: string; tilt?: boolean }) {
  return (
    <div className={`mkt-phone${tilt ? " tilt" : ""}`} tabIndex={0} role="img" aria-label={alt}>
      <div className="mkt-screen-window">
        <img src={`${SCREENS}/${src}`} alt="" width={390} height={1283} />
      </div>
    </div>
  );
}

/** "/" — logged-in users go to their app; visitors get the marketing home. */
export default async function Home() {
  const prac = await getCurrentPractitioner();
  if (prac) redirect("/focus");
  const patient = await getCurrentPatient();
  if (patient) redirect("/home");

  return (
    <SiteShell>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <h1 className="mkt-display">
              From a scan to a plan
              <br />
              they&apos;ll <span className="mkt-lime-underline">actually follow</span>.
            </h1>
            <p className="mkt-lead">
              Upload your client&apos;s data and we turn it into a simple visual. AI drafts the 90-day
              plan, you approve it, and you both track progress every session.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/product" className="mkt-btn ghost lg">See how it works →</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-plan-builder.png" alt="A doctor's 90-day plan builder" label="app.healthintelligency.com/plan" tilt />
          </div>
        </div>
        <div className="mkt-wrap mkt-hero-strip">
          <div className="mkt-strip">
            <span>In production with <b>Casa Elev8</b></span>
            <span className="dot" />
            <span><b>HIPAA-ready</b></span>
            <span className="dot" />
            <span>Live in <b>days</b>, not months</span>
          </div>
        </div>
      </section>

      {/* ---- 1. Upload → visual ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Step one</p>
            <h2 className="mkt-h2">Upload a scan. We make it simple.</h2>
            <p className="mkt-p">
              Drop in a scan, a lab PDF or a device export. Central Health Intelligence turns the dense
              data into a clean visual your client can actually understand — no live device hookups to set up.
            </p>
            <ul className="mkt-points">
              <li>Upload scans, labs and device exports — by file, not fuss</li>
              <li>We map the numbers into a simple, visual picture</li>
              <li>The client sees their body and results in plain language</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-results-review.png" alt="A client's results turned into a simple visual" label="app.healthintelligency.com/results" />
          </div>
        </div>
      </section>

      {/* ---- 2. AI 90-day plan ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Browser src="be-plan-synthesis.png" alt="AI drafting a 90-day plan for the doctor to approve" label="app.healthintelligency.com/plan" />
          </div>
          <div>
            <p className="mkt-kicker">Step two</p>
            <h2 className="mkt-h2">The 90-day plan, drafted by AI.</h2>
            <p className="mkt-p">
              From the data, AI drafts a structured 90-day plan — vitamins, minerals, exercise and
              modalities, laid out on a schedule. You work the AI to shape it, then approve. Your notes
              are AI-assisted too. Nothing reaches the client until you sign off.
            </p>
            <ul className="mkt-points">
              <li>AI proposes the plan; the doctor edits and approves</li>
              <li>Phased and scheduled — every step has a date</li>
              <li>AI-assisted notes, so the writing isn&apos;t your job</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- 3. Client app: clean plan + AI assistant ---- */}
      <section className="mkt-section sand">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Personal Health Intelligence</p>
            <h2 className="mkt-h2">A clean plan your client actually follows.</h2>
            <p className="mkt-p">
              The client opens their app to a simple daily schedule — what to take, what to do, today.
              When they have a question, they ask the AI assistant, grounded in your plan and your
              clinic&apos;s knowledge. No more back-and-forth filling your inbox.
            </p>
            <ul className="mkt-points">
              <li>A scheduled plan where every to-do is simple and clear</li>
              <li>An AI assistant that answers questions about their plan</li>
              <li>Far fewer messages back to you</li>
            </ul>
          </div>
          <div className="mkt-row-media mkt-phone-center">
            <Phone src="fe-plan.png" alt="The client's clean, scheduled 90-day plan" tilt />
          </div>
        </div>
      </section>

      {/* ---- 4. Track both sides ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media mkt-phone-center">
            <Phone src="fe-today.png" alt="The client tracking their progress day to day" tilt />
          </div>
          <div>
            <p className="mkt-kicker">Both ends</p>
            <h2 className="mkt-h2">Track progress, every session.</h2>
            <p className="mkt-p">
              The client logs their days and watches their own progress build. You see how each client
              is tracking against their plan before they walk in — so every session picks up where the
              last one left off.
            </p>
            <ul className="mkt-points">
              <li>The client tracks their own progress and streaks</li>
              <li>The doctor sees what moved since the last visit</li>
              <li>Plus your dispensary and email list, in the same place</li>
            </ul>
            <div className="mkt-action">
              <Link href="/product" className="mkt-btn ghost">See the whole flow</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Editions ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Three ways to run it.</h2>
          <p className="mkt-lead mkt-editions-lead">Same product — choose the isolation and compliance your practice needs.</p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Cloud</h3>
              <p className="mkt-muted mkt-three-p">Shared multi-tenant cloud. Fastest and most affordable — live in days.</p>
            </div>
            <div>
              <h3 className="mkt-h3">HIPAA Cloud</h3>
              <p className="mkt-muted mkt-three-p">Managed compliant tier: signed BAAs, US-PHI-ready, full controls.</p>
            </div>
            <div>
              <h3 className="mkt-h3">Private Cloud</h3>
              <p className="mkt-muted mkt-three-p">A dedicated, isolated instance on your own VPS. White-label, enterprise.</p>
            </div>
          </div>
          <div className="mkt-action-lg">
            <Link href="/pricing" className="mkt-btn ghost">See pricing</Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["How does the client data get in?", "You upload it — a scan, a lab PDF, or a device export. No live device integrations to configure; just drop in the file and we turn it into a visual."],
              ["Does the AI decide anything?", "No. The AI drafts the plan and the notes; the doctor reviews, edits and approves. Nothing reaches the client until you sign off."],
              ["What does the client actually see?", "A clean, scheduled 90-day plan — what to take and do each day — plus an AI assistant that answers their questions about it, so they're not messaging you."],
              ["Is it HIPAA compliant?", "The HIPAA Cloud edition runs with signed BAAs and the compliance controls US practices need. Non-US practices can start on Cloud today."],
              ["How fast can we launch?", "Days, not the 12–24-month implementations enterprise EHRs require. You can migrate from a spreadsheet, Jane or Noterro."],
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
          <h2 className="mkt-h2">See it on your clients&apos; data.</h2>
          <p className="mkt-lead mkt-cta-lead">
            A short demo, your specialty, your questions.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </SiteShell>
  );
}
