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
              <Link href="/platform/intelligence" className="mkt-btn ghost lg">See the platform</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A morning briefing showing what changed for a patient since their last visit">
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Morning briefing · 8 patients today
              </div>
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
                  <strong style={{ color: "var(--green)" }}>AI draft</strong> · Talking points ready for review — sleep regression and glucose trend.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mkt-wrap" style={{ marginTop: 44 }}>
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
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            Legacy EHRs are filing cabinets. Central Health Intelligence is a live picture — every source
            flowing in, AI watching for what changed, the doctor deciding what matters.
          </p>
          <div className="mkt-three">
            <div>
              <h3>The doctor leads</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                A morning briefing of what changed since each visit. Nothing is decided without them.
              </p>
            </div>
            <div>
              <h3>AI synthesizes</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Drafts notes, replies and talking points from the live data — and waits for approval.
              </p>
            </div>
            <div>
              <h3>The patient owns</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
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
            <div className="mkt-device">
              <div style={{ padding: 18 }}>
                {[
                  ["Oura", "synced 2m ago"],
                  ["Dexcom CGM", "live"],
                  ["Withings scale", "synced 1h ago"],
                  ["Quest labs", "3 panels imported"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14.5 }}>
                    <span>{k}</span>
                    <span style={{ fontSize: 12.5, color: "var(--green)" }}>● {v}</span>
                  </div>
                ))}
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
            <div style={{ marginTop: 24 }}>
              <Link href="/platform/intelligence" className="mkt-btn ghost">How the intelligence layer works</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {["Sleep regression — 3 patients", "Glucose trending up — 2 patients", "Labs due this week — 5"].map((t) => (
                  <div key={t} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 11, fontSize: 14.5 }}>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Editions ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">Three ways to run it.</h2>
          <p className="mkt-lead" style={{ marginBottom: 36 }}>Same product — choose the isolation and compliance your clinic needs.</p>
          <div className="mkt-three">
            <div>
              <h3>Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>Shared multi-tenant cloud. Fastest and most affordable — live in days.</p>
            </div>
            <div>
              <h3>HIPAA Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>Managed compliant tier: signed BAAs, US-PHI-ready, full controls.</p>
            </div>
            <div>
              <h3>Private Cloud</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>A dedicated, isolated instance on your own VPS. White-label, enterprise.</p>
            </div>
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/pricing" className="mkt-btn ghost">Compare editions &amp; pricing</Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Questions, answered.</h2>
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
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            A short demo, your specialty, your questions.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </SiteShell>
  );
}
