import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connectors",
  description:
    "Real-time sync from Oura, Apple Health, Garmin, Withings and Dexcom CGM, plus labs by CSV, PDF or FHIR — normalized into one daily patient picture, isolated per tenant, with a webhook and retry job queue. The connector moat.",
};

export default function ConnectorsPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">The connector moat</p>
            <h1 className="mkt-display">
              Every source, <span className="mkt-lime-underline">live</span>.
            </h1>
            <p className="mkt-lead">
              Wearables, scales, CGM and labs sync continuously and normalize into one daily picture per
              patient. It&apos;s the thing a storage-first EHR can&apos;t give a clinic — and the work that&apos;s
              hard to copy.
            </p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/platform/intelligence" className="mkt-btn ghost lg">What we do with the data</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device tilt" role="img" aria-label="A list of connected data sources, each showing a live sync status">
              <div style={{ background: "var(--mint)", padding: "14px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Connected sources · this tenant
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["Oura", "synced 2m ago"],
                  ["Apple Health", "synced 6m ago"],
                  ["Garmin", "synced 18m ago"],
                  ["Withings scale", "synced 1h ago"],
                  ["Dexcom CGM", "live"],
                  ["Quest labs", "3 panels imported"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14.5 }}>
                    <span>{k}</span>
                    <span style={{ fontSize: 12.5, color: "var(--green)" }}>● {v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Real-time sources ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ padding: 18, display: "grid", gap: 10 }}>
                {[
                  ["Oura", "Sleep, HRV, readiness"],
                  ["Apple Health", "Activity, vitals, workouts"],
                  ["Garmin", "Training load, sleep"],
                  ["Withings", "Weight, body composition, BP"],
                  ["Dexcom", "Continuous glucose"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 11, fontSize: 14 }}>
                    <strong style={{ fontWeight: 600 }}>{k}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Patient-connected, real-time</p>
            <h2 className="mkt-h2">The devices your patients already wear.</h2>
            <p className="mkt-p">
              Patients connect their own accounts once, and readings flow in from there — no manual entry,
              no exports passed around. The CGM stream stays live; the rest sync on their own cadence.
            </p>
            <ul className="mkt-points">
              <li>Oura, Apple Health, Garmin, Withings and Dexcom CGM</li>
              <li>Connected by the patient, owned by the patient</li>
              <li>Continuous sync — the picture keeps itself current</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Labs ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Labs, your way in</p>
            <h2 className="mkt-h2">CSV, PDF or FHIR — mapped to trends.</h2>
            <p className="mkt-p">
              However your lab results arrive, they come in. Upload a CSV or PDF, or connect a FHIR feed,
              and panels are parsed and mapped onto each patient&apos;s timeline alongside their wearable data.
            </p>
            <ul className="mkt-points">
              <li>CSV and PDF upload for results from any lab</li>
              <li>FHIR for direct, structured feeds where available</li>
              <li>Markers mapped to trends, not left as loose files</li>
            </ul>
          </div>
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Lab import · mapped
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["HbA1c", "5.4%", "in range"],
                  ["ApoB", "82 mg/dL", "watch"],
                  ["hs-CRP", "0.9 mg/L", "in range"],
                  ["Ferritin", "210 ng/mL", "in range"],
                ].map(([k, v, s]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{k}</span>
                    <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <strong>{v}</strong>
                      <span style={{ fontSize: 11.5, color: s === "watch" ? "#bb5234" : "var(--green)" }}>{s}</span>
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>Imported from PDF · 1 panel, 38 markers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- One normalized picture ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <p className="mkt-kicker">One daily picture</p>
          <h2 className="mkt-h2">Many feeds in. One patient out.</h2>
          <p className="mkt-lead" style={{ marginBottom: 40 }}>
            Different devices, units and formats are normalized into a single, comparable daily snapshot —
            the thing the briefing and the AI read from.
          </p>
          <div className="mkt-three">
            <div>
              <h3 className="mkt-h3">Normalized</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Units and metrics are reconciled across sources so a trend means the same thing everywhere.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">Per-tenant isolation</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                Each clinic&apos;s data is scoped to its own tenant. No clinic ever sees another&apos;s patients.
              </p>
            </div>
            <div>
              <h3 className="mkt-h3">One snapshot</h3>
              <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
                The result is a single daily picture per patient — what everything else reads from.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Reliability: webhook + retry queue ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <div className="mkt-device">
              <div style={{ background: "var(--mint)", padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                Job queue · last hour
              </div>
              <div style={{ padding: 18 }}>
                {[
                  ["Webhooks received", "4,206", "var(--green)"],
                  ["Processed", "4,206", "var(--green)"],
                  ["Retried (transient)", "11", "var(--muted)"],
                  ["Failed after retry", "0", "var(--green)"],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span>{k}</span>
                    <strong style={{ color: c as string }}>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="mkt-kicker">Built to not drop data</p>
            <h2 className="mkt-h2">Webhooks in, retries until they land.</h2>
            <p className="mkt-p">
              Sources push updates by webhook into a job queue. Transient failures are retried with backoff,
              so a flaky vendor API or a momentary outage doesn&apos;t leave a gap in the record.
            </p>
            <ul className="mkt-points">
              <li>Webhook ingestion for near-real-time updates</li>
              <li>A retry job queue with backoff for transient failures</li>
              <li>Visibility into what synced, what retried and what needs attention</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Which sources connect today?", "Oura, Apple Health, Garmin, Withings and Dexcom CGM for device data, plus labs by CSV, PDF or FHIR."],
              ["Who connects the devices?", "Patients connect their own accounts once. Readings flow in from there, and the data stays theirs."],
              ["How do labs come in?", "Upload a CSV or PDF, or connect a FHIR feed. Markers are parsed and mapped onto the patient's timeline rather than stored as loose files."],
              ["How is one clinic's data kept separate?", "Every source normalizes into a per-tenant snapshot. Data is scoped to its tenant, so no clinic sees another's patients."],
              ["What happens if a sync fails?", "Updates arrive by webhook into a job queue. Transient failures are retried with backoff, so momentary outages don't leave gaps."],
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
          <h2 className="mkt-h2">Connect a source, see it land.</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            A short demo with your devices and a real lab panel.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
