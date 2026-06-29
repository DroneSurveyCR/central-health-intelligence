import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modules",
  description:
    "The Central Health Intelligence module catalog. A free clinical core plus add-ons for labs, wearables, peptides, hormones, plant medicine, longevity and more — enable only what your clinic needs.",
};

type Mod = { name: string; desc: string; price: string };

const FREE: Mod[] = [
  { name: "Core", desc: "Charts, encounters, the live picture", price: "Included" },
  { name: "Scheduling", desc: "Calendar, intake and check-in", price: "Included" },
  { name: "Billing", desc: "Superbills, invoices, payments", price: "Included" },
  { name: "Patient portal", desc: "Personal Health Intelligence access", price: "Included" },
  { name: "Engagement", desc: "Messaging, reminders, recalls", price: "Included" },
];

const ADDONS: Mod[] = [
  { name: "Labs", desc: "Import, map and trend lab panels", price: "$39/mo" },
  { name: "Wearables & CGM", desc: "Live device and glucose data", price: "$49/mo" },
  { name: "Weight & body comp", desc: "Scale and composition tracking", price: "$29/mo" },
  { name: "Nutrition & food", desc: "Food logging and macro trends", price: "$39/mo" },
  { name: "e-Prescribing", desc: "Send prescriptions electronically", price: "$49/mo" },
  { name: "Peptide / GLP-1", desc: "Protocols, titration, monitoring", price: "$79/mo" },
  { name: "Plant Medicine / KAP", desc: "Ketamine and KAP workflows", price: "$79/mo" },
  { name: "Hormone / HRT", desc: "HRT protocols and lab tracking", price: "$79/mo" },
  { name: "Longevity & biomarkers", desc: "Biomarker panels and aging trends", price: "$49/mo" },
  { name: "Telehealth", desc: "Video visits and remote care", price: "$49/mo" },
  { name: "Dispensary", desc: "In-clinic inventory and sales", price: "$39/mo" },
  { name: "Reports & exports", desc: "Custom reports and data exports", price: "$29/mo" },
  { name: "Marketplace", desc: "Partner labs and supplement orders", price: "$49/mo" },
  { name: "Multi-location", desc: "Run several sites as one clinic", price: "$99/mo" },
];

function Grid({ items }: { items: Mod[] }) {
  return (
    <div
      style={{
        marginTop: 28,
        border: "1px solid var(--line)",
        borderRadius: 16,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        background: "var(--line)",
        gap: 1,
      }}
    >
      {items.map((m) => (
        <div key={m.name} style={{ background: "#fff", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.005em" }}>{m.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)", whiteSpace: "nowrap" }}>{m.price}</span>
          </div>
          <p className="mkt-muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.45 }}>{m.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function ModulesPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">The catalog</p>
          <h1 className="mkt-display" style={{ maxWidth: "14ch" }}>
            Build the clinic you <span className="mkt-lime-underline">actually</span> run.
          </h1>
          <p className="mkt-lead" style={{ marginTop: 18 }}>
            Central Health Intelligence ships with a complete clinical core for free. Everything else is
            a module — enable only what you need, add the rest as you grow.
          </p>
          <div className="mkt-hero-cta">
            <Link href="/pricing" className="mkt-btn lg">See full pricing</Link>
            <Link href="/contact" className="mkt-btn ghost lg">Book a demo</Link>
          </div>
        </div>
      </section>

      {/* ---- Free / included ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Free — included with every plan</p>
          <h2 className="mkt-h2">The core, on the house.</h2>
          <p className="mkt-lead">
            The whole clinic runs from day one — charts, scheduling, billing, the patient portal and
            engagement — at no extra cost.
          </p>
          <Grid items={FREE} />
        </div>
      </section>

      {/* ---- Add-ons ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Add-ons</p>
          <h2 className="mkt-h2">Specialty depth, priced per module.</h2>
          <p className="mkt-lead">
            Turn on the workflows your specialty needs — from labs and wearables to peptide, hormone
            and plant-medicine protocols. Flat monthly pricing, per clinic.
          </p>
          <Grid items={ADDONS} />
          <p className="mkt-p" style={{ marginTop: 28 }}>
            Enable only what you need — and add modules any time.{" "}
            <Link href="/pricing" style={{ color: "var(--green)", fontWeight: 600 }}>See how it adds up on the pricing page →</Link>
          </p>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <h2 className="mkt-h2" style={{ textAlign: "center", marginBottom: 32 }}>Questions, answered.</h2>
          <div className="mkt-faq">
            {[
              ["Do I have to take every module?", "No. The core is free and complete on its own. You add only the modules your specialty needs, and you can turn them on or off at any time."],
              ["Is module pricing per provider or per clinic?", "Add-on prices shown here are flat monthly fees per clinic, layered on top of your plan. The pricing page shows how it totals for your team."],
              ["Can I change modules later?", "Yes. Enable a module the day you need it and disable it when you don't — billing follows what's active, with no long implementation."],
              ["Which modules fit my specialty?", "Most longevity, functional-medicine, peptide/GLP-1, hormone/HRT and KAP clinics start with Labs, Wearables & CGM and their specialty module, then grow from there."],
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
          <h2 className="mkt-h2">Not sure which modules you need?</h2>
          <p className="mkt-lead" style={{ margin: "0 auto 26px", textAlign: "center" }}>
            Tell us your specialty and we&apos;ll map a setup to it.
          </p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
