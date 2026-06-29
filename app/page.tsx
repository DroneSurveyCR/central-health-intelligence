import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPractitioner, getCurrentPatient } from "@/lib/auth/roles";
import SiteShell from "@/components/site/SiteShell";

const SCREENS = "/screens";

export const metadata: Metadata = {
  title: { absolute: "Central Health Intelligence — live health intelligence for clinics" },
  description:
    "Central Health Intelligence keeps patient data live — wearables, labs and CGM in one picture, with AI that drafts and the doctor approves. For longevity, functional-medicine and integrative clinics. By Health Intelligency.",
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
              Every signal.
              <br />
              One patient <span className="mkt-lime-underline">picture</span>.
            </h1>
            <p className="mkt-lead">
              A live health platform for longevity, functional-medicine and integrative clinics.
              Wearables, labs and CGM in one view — AI drafts, the doctor approves.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <a href="/api/demo" className="mkt-btn ghost lg">Try it live →</a>
            </div>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-dashboard.png" alt="Central Health Intelligence — clinician morning briefing dashboard" label="app.healthintelligency.com" tilt />
          </div>
        </div>
        <div className="mkt-wrap mkt-hero-strip">
          <div className="mkt-strip">
            <span>In production with <b>Casa Elev8</b></span>
            <span className="dot" />
            <span><b>HIPAA-ready</b></span>
            <span className="dot" />
            <span><b>0</b> cross-tenant leaks</span>
            <span className="dot" />
            <span>Live in <b>days</b>, not months</span>
          </div>
        </div>
      </section>

      {/* ---- Personal Health Intelligence (patient app) ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media mkt-phone-center">
            <Phone src="fe-dashboard.png" alt="Personal Health Intelligence — the patient's health dashboard" tilt />
          </div>
          <div>
            <p className="mkt-kicker">Personal Health Intelligence</p>
            <h2 className="mkt-h2">A concierge app for every patient.</h2>
            <p className="mkt-p">
              Patients get their own Personal Health Intelligence — results, care plan and an AI
              assistant trained on the clinic&apos;s own knowledge, not a generic chatbot.
            </p>
            <ul className="mkt-points">
              <li>Results and labs, mapped to trends over time</li>
              <li>An AI assistant that answers from the clinic&apos;s protocols</li>
              <li>Care plan, booking and messages in one app</li>
            </ul>
            <p className="mkt-device-hint">Hover a phone to scroll the screen.</p>
          </div>
        </div>
      </section>

      {/* ---- Clinician dashboard ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">The clinician dashboard</p>
            <h2 className="mkt-h2">Walk in already knowing what changed.</h2>
            <p className="mkt-p">
              Each morning the system computes what moved for every patient since their last visit.
              AI drafts the talking points; the doctor reads, edits and approves — nothing is applied
              on its own.
            </p>
            <ul className="mkt-points">
              <li>A per-patient delta since the last visit, every morning</li>
              <li>A severity-sorted triage worklist for the whole team</li>
              <li>AI-drafted notes — reviewed, never auto-applied</li>
            </ul>
            <div className="mkt-action">
              <Link href="/platform/intelligence" className="mkt-btn ghost">How the intelligence layer works</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <Browser src="be-records.png" alt="Clinician view — patient records with live data" label="app.healthintelligency.com/records" />
          </div>
        </div>
      </section>

      {/* ---- Connectors ---- */}
      <section className="mkt-section sand">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Browser src="be-results-review.png" alt="Results review — lab and wearable data in one view" label="app.healthintelligency.com/results" />
          </div>
          <div>
            <p className="mkt-kicker">The connector moat</p>
            <h2 className="mkt-h2">Every source, live.</h2>
            <p className="mkt-p">
              Patients connect their own wearables once. Oura, Apple Health, Garmin, Withings and
              Dexcom CGM then sync continuously into one picture — alongside labs by CSV, PDF or FHIR.
            </p>
            <ul className="mkt-points">
              <li>Oura, Apple Health, Garmin, Withings, Dexcom CGM</li>
              <li>Labs mapped to trends automatically</li>
              <li>One snapshot per patient, isolated per clinic</li>
            </ul>
            <div className="mkt-action">
              <Link href="/platform/connectors" className="mkt-btn ghost">Connectors in detail</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Editions ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Three ways to run it.</h2>
          <p className="mkt-lead mkt-editions-lead">Same product — choose the isolation and compliance your clinic needs.</p>
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
            <Link href="/pricing" className="mkt-btn ghost">Compare editions &amp; pricing</Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Is it HIPAA compliant?", "The HIPAA Cloud edition runs with signed BAAs and the compliance controls US clinics need. Non-US clinics can start on Cloud today."],
              ["How fast can we launch?", "Days, not the 12–24-month implementations enterprise EHRs require. You can migrate from a spreadsheet, Jane or Noterro."],
              ["Which specialties is it for?", "Longevity, functional medicine, peptide/GLP-1, hormone/HRT and plant-medicine/KAP clinics — the verticals mainstream EHRs don't serve well."],
              ["Do patients really own their data?", "Yes. Patients connect their own devices and can export a full, portable copy of their record on request."],
              ["How is it priced?", "A per-provider plan plus the modules you choose — at parity with a legacy EHR, but with the live-data and AI layer they don't have."],
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
          <h2 className="mkt-h2">See it on your clinic&apos;s data.</h2>
          <p className="mkt-lead mkt-cta-lead">
            A short demo, your specialty, your questions.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </SiteShell>
  );
}
