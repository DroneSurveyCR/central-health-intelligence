import Link from "next/link";
import type { Metadata } from "next";

const SCREENS = "/screens";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The whole loop on one platform: client intake and scheduling, upload a scan and we turn it into a simple visual, AI drafts the 90-day plan you approve, the client follows a clean schedule and asks the AI their questions, and both sides track progress every session.",
};

function Browser({ src, alt, label }: { src: string; alt: string; label?: string }) {
  return (
    <div className="mkt-screen">
      <div className="mkt-screen-bar">{label ? <span className="mkt-screen-url">{label}</span> : null}</div>
      <img src={`${SCREENS}/${src}`} alt={alt} width={1440} height={900} />
    </div>
  );
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mkt-phone" tabIndex={0} role="img" aria-label={alt}>
      <div className="mkt-screen-window">
        <img src={`${SCREENS}/${src}`} alt="" width={390} height={1283} />
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How it works</p>
          <h1 className="mkt-display">One loop, one platform.</h1>
          <p className="mkt-lead mkt-hero-lead-wide">
            A client comes in, you upload their data, we make it simple, AI drafts the plan you
            approve, the client follows it, and you both track progress. That&apos;s the whole product —
            nothing you don&apos;t need.
          </p>
          <div className="mkt-hero-cta">
            <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
            <Link href="/pricing" className="mkt-btn ghost lg">See pricing →</Link>
          </div>
        </div>
      </section>

      {/* ---- 1. Intake & scheduling ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Step 1 · Intake &amp; scheduling</p>
            <h2 className="mkt-h2">Clients onboard themselves.</h2>
            <p className="mkt-p">
              Send one link. The client fills in intake and consent, picks a time, and gets confirmed —
              then automatic reminders keep them on schedule. One synced calendar across the practice;
              no phone tag, no no-shows.
            </p>
            <ul className="mkt-points">
              <li>Self-serve intake &amp; consent from a single link</li>
              <li>Booking with automatic reminders and follow-ups</li>
              <li>One calendar — merges your scattered Google calendars</li>
            </ul>
          </div>
          <div className="mkt-row-media mkt-phone-center">
            <Phone src="fe-intake.png" alt="A client completing intake on their phone" />
          </div>
        </div>
      </section>

      {/* ---- 2. Upload & visualize ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Browser src="be-results-review.png" alt="Uploaded data turned into a simple visual" label="app.healthintelligency.com/results" />
          </div>
          <div>
            <p className="mkt-kicker">Step 2 · Upload &amp; visualize</p>
            <h2 className="mkt-h2">Upload a scan. We make it simple.</h2>
            <p className="mkt-p">
              Drop in a scan, a lab PDF or a device export. We map the dense data into a clean visual the
              client can explore and understand — no live device integrations to wire up.
            </p>
            <ul className="mkt-points">
              <li>Upload by file: scans, labs, device exports</li>
              <li>Numbers mapped into a clear visual picture</li>
              <li>The client sees their body and results in plain language</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- 3. AI builds the plan ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Step 3 · The 90-day plan</p>
            <h2 className="mkt-h2">AI drafts it. The doctor approves it.</h2>
            <p className="mkt-p">
              From the data, AI drafts a structured 90-day plan — vitamins, minerals, exercise and
              modalities on a schedule. You work the AI to shape it, edit anything, and approve. Your
              clinical notes are AI-assisted too. Nothing reaches the client until you sign off.
            </p>
            <ul className="mkt-points">
              <li>AI proposes a phased, scheduled plan from the data</li>
              <li>The doctor edits and approves — AI never decides</li>
              <li>AI-assisted notes, so writing isn&apos;t your job</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-plan-builder.png" alt="The doctor's AI-assisted 90-day plan builder" label="app.healthintelligency.com/plan" />
          </div>
        </div>
      </section>

      {/* ---- 4. Client follows + AI assistant ---- */}
      <section className="mkt-section sand">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media mkt-phone-center">
            <Phone src="fe-plan.png" alt="The client's clean, scheduled plan" />
          </div>
          <div>
            <p className="mkt-kicker">Step 4 · The client app</p>
            <h2 className="mkt-h2">A clean plan, and an AI that answers.</h2>
            <p className="mkt-p">
              The client opens Personal Health Intelligence to a simple daily schedule — what to take,
              what to do, today. When they have a question, they ask the AI assistant, grounded in your
              plan and your clinic&apos;s knowledge. The back-and-forth stops filling your inbox.
            </p>
            <ul className="mkt-points">
              <li>A scheduled plan where every to-do is simple and clear</li>
              <li>An AI assistant that answers questions about their plan</li>
              <li>Far fewer messages back to the doctor</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- 5. Track both ends ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Step 5 · Track both ends</p>
            <h2 className="mkt-h2">Progress, on both sides.</h2>
            <p className="mkt-p">
              The client logs their days and watches their own progress build. You see how each client
              is tracking against their plan before they arrive — so every session continues from the
              last one instead of starting over.
            </p>
            <ul className="mkt-points">
              <li>The client tracks their own progress and streaks</li>
              <li>The doctor sees what moved since the last visit</li>
              <li>The relationship is the product — both ends, in sync</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-records.png" alt="The doctor tracking a client's progress over sessions" label="app.healthintelligency.com/clients" />
          </div>
        </div>
      </section>

      {/* ---- Store + campaigns ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">And the business runs in the same place</p>
          <h2 className="mkt-h2">Your dispensary and your list, built in.</h2>
          <p className="mkt-lead mkt-p-lead-gap">
            Recommend supplements off the plan and sell them in-app — you keep 100%, we never take a cut.
            Keep your whole audience in one place and send campaigns and reminders yourself. You own every contact.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">In-app dispensary</h3>
              <p className="mkt-muted mkt-three-p">Sell supplements tied to the plan. No percentage of your sales, ever.</p>
            </div>
            <div>
              <h3 className="mkt-h3">Your email list</h3>
              <p className="mkt-muted mkt-three-p">Campaigns, newsletters and reminders from inside the platform. You own the list.</p>
            </div>
            <div>
              <h3 className="mkt-h3">One record</h3>
              <p className="mkt-muted mkt-three-p">Store, list, plan and results all tie back to the same client.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">See the whole loop on your data.</h2>
          <p className="mkt-lead mkt-cta-lead">A short demo, your specialty, your questions.</p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
