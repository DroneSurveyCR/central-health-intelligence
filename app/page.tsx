import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPractitioner, getCurrentPatient } from "@/lib/auth/roles";
import SiteShell from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: { absolute: "Central Health Intelligence — live health intelligence for clinics" },
  description:
    "Central Health Intelligence keeps patient data live — wearables, labs and CGM in one picture, with AI that drafts and the doctor approves. For longevity, functional-medicine and integrative clinics. By Health Intelligency.",
};

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
              Central Health Intelligence keeps your patients&apos; data live — wearables, labs and CGM in
              one view — with AI that drafts and the doctor approves. Built for the longevity,
              functional-medicine and integrative clinics the big EHRs overlook.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <a href="/api/demo" className="mkt-btn ghost lg">Try it live →</a>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="Central Health Intelligence — clinician morning briefing dashboard">
              <div className="mkt-briefing-bar">Morning briefing · Mon 9 Jun</div>
              <div className="mkt-briefing-body">
                <div className="mkt-briefing-row">
                  <div className="mkt-briefing-name">Aria Solberg</div>
                  <div className="mkt-briefing-sub">Longevity · follow-up Tue</div>
                </div>
                <div className="mkt-stat"><span className="mkt-alert-sub">HRV 7-day avg</span><span className="mkt-stat-val red">↓ 38 ms</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Glucose, time in range</span><span className="mkt-stat-val red">−12%</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Sleep efficiency</span><span className="mkt-stat-val ink">74%</span></div>
                <div className="mkt-briefing-row">
                  <div className="mkt-briefing-name">Marcus Webb</div>
                  <div className="mkt-briefing-sub">Peptide / GLP-1 · labs due</div>
                </div>
                <div className="mkt-stat"><span className="mkt-alert-sub">ApoB</span><span className="mkt-stat-val ink">82 mg/dL</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Weight trend</span><span className="mkt-stat-val green">−1.8 kg</span></div>
                <div className="mkt-briefing-note">AI-drafted talking points ready · awaiting your review</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mkt-wrap mkt-hero-strip">
          <div className="mkt-strip">
            <span>In production with <b>Casa Elev8</b></span>
            <span className="dot" />
            <span><b>HIPAA-ready</b></span>
            <span className="dot" />
            <span><b>0</b> cross-tenant leaks, verified across 18 tables</span>
            <span className="dot" />
            <span>Live in <b>days</b>, not months</span>
          </div>
        </div>
      </section>

      {/* ---- The wedge: Doctor / AI / Patient ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Why we&apos;re different</p>
          <h2 className="mkt-h2">Most systems store your patients&apos; data. We keep it live.</h2>
          <p className="mkt-lead mkt-wedge-lead">
            Legacy EHRs are filing cabinets. Central Health Intelligence is a live picture — every source
            flowing in, AI watching for what changed, the doctor deciding what matters.
          </p>
          <div className="mkt-three">
            <div>
              <h3>The doctor leads</h3>
              <p className="mkt-muted mkt-three-p">
                A morning briefing of what changed since each visit. Nothing is decided without them.
              </p>
            </div>
            <div>
              <h3>AI synthesizes</h3>
              <p className="mkt-muted mkt-three-p">
                Drafts notes, replies and talking points from the live data — and waits for approval.
              </p>
            </div>
            <div>
              <h3>The patient owns</h3>
              <p className="mkt-muted mkt-three-p">
                Their data, their copy — connected from their own devices, portable on request.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Connectors (the moat) ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device" role="img" aria-label="Patient records with live wearable and lab data in one view">
              <div className="mkt-briefing-bar">Connected sources · Aria Solberg</div>
              <div className="mkt-briefing-body">
                <div className="mkt-connector-row"><span>Oura Ring</span><span className="mkt-connector-state on">● synced 2m ago</span></div>
                <div className="mkt-connector-row"><span>Apple Health</span><span className="mkt-connector-state on">● synced 6m ago</span></div>
                <div className="mkt-connector-row"><span>Dexcom CGM</span><span className="mkt-connector-state on">● live</span></div>
                <div className="mkt-connector-row"><span>Withings scale</span><span className="mkt-connector-state on">● synced 1h ago</span></div>
                <div className="mkt-connector-row"><span>Quest labs</span><span className="mkt-connector-state on">● 3 panels imported</span></div>
                <div className="mkt-briefing-note">All sources current · next sync in 4m</div>
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">The connector moat</p>
            <h2 className="mkt-h2">Real-time data, from every source.</h2>
            <p className="mkt-p">
              Wearables, CGM, scales and labs sync continuously into one normalized picture — the thing
              storage-first EHRs and data-only platforms can&apos;t give a clinic.
            </p>
            <ul className="mkt-points">
              <li>Patient-connected — Oura, Apple Health, Garmin, Withings, Dexcom</li>
              <li>Labs by CSV, PDF or FHIR, mapped to trends automatically</li>
              <li>One snapshot per patient, scoped so no clinic ever sees another&apos;s data</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Briefing feature row ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Your day, pre-read</p>
            <h2 className="mkt-h2">Walk in already knowing what changed.</h2>
            <p className="mkt-p">
              Each morning, a per-patient delta: what moved since the last visit, what needs attention,
              and AI-drafted talking points — review and approve, never auto-applied.
            </p>
            <div className="mkt-action">
              <Link href="/platform/intelligence" className="mkt-btn ghost">How the intelligence layer works</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="Patient app — personal health intelligence on mobile">
              <div className="mkt-briefing-bar">Your morning · Mon 9 Jun</div>
              <div className="mkt-briefing-body">
                <div className="mkt-stat"><span className="mkt-alert-sub">HRV last night</span><span className="mkt-stat-val green">52 ms ↑</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Sleep</span><span className="mkt-stat-val ink">7h 14m · 81%</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Glucose, 24h avg</span><span className="mkt-stat-val ink">94 mg/dL</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Steps yesterday</span><span className="mkt-stat-val green">9,402</span></div>
                <div className="mkt-briefing-note">Message from Dr Elara · tap to read</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Two-device showcase ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Anywhere</p>
          <h2 className="mkt-h2">One platform. Clinic and patient, in sync.</h2>
          <p className="mkt-p">
            Clinicians work from a full dashboard. Patients connect from their phone — wearables,
            results and messaging all in one place, with no extra apps to install.
          </p>
          <div className="mkt-devices-duo">
            <div className="mkt-device" role="img" aria-label="Central Health Intelligence scheduling and calendar view">
              <div className="mkt-briefing-bar">Today · 6 appointments</div>
              <div className="mkt-briefing-body">
                <div className="mkt-stat"><span className="mkt-alert-sub">09:00</span><span>Aria Solberg · follow-up</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">10:30</span><span>Marcus Webb · intake</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">11:15</span><span>Priya Nair · labs review</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">14:00</span><span>James Okafor · peptide check-in</span></div>
                <div className="mkt-briefing-note">2 AI draft notes ready for review</div>
              </div>
            </div>
            <div className="mkt-device" role="img" aria-label="Patient app — progress tracking and before/after view">
              <div className="mkt-briefing-bar">Your progress · 90 days</div>
              <div className="mkt-briefing-body">
                <div className="mkt-stat"><span className="mkt-alert-sub">Weight</span><span className="mkt-stat-val green">−6.2 kg</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">HRV trend</span><span className="mkt-stat-val green">+14 ms</span></div>
                <div className="mkt-stat"><span className="mkt-alert-sub">Glucose avg</span><span className="mkt-stat-val green">↓ 8 mg/dL</span></div>
                <div className="mkt-briefing-note">Next visit: Tue 10:30 with Dr Elara</div>
              </div>
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
              <h3>Cloud</h3>
              <p className="mkt-muted mkt-three-p">Shared multi-tenant cloud. Fastest and most affordable — live in days.</p>
            </div>
            <div>
              <h3>HIPAA Cloud</h3>
              <p className="mkt-muted mkt-three-p">Managed compliant tier: signed BAAs, US-PHI-ready, full controls.</p>
            </div>
            <div>
              <h3>Private Cloud</h3>
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
              ["Which specialties is it for?", "Longevity, functional medicine, peptide/GLP-1, hormone/HRT and plant-medicine/KAP clinics — the verticals mainstream EHRs don't serve well. You enable only the modules you need."],
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
