import Link from "next/link";
import type { Metadata } from "next";
import { VERTICALS } from "@/lib/site/verticals";

export const metadata: Metadata = {
  title: "Who it's for",
  description:
    "Central Health Intelligence works for how you practice — bioresonance, functional medicine, peptide & GLP-1, longevity, HRT, chiropractic and plant medicine. Whatever you measure becomes a visual, an AI 90-day plan you approve, and progress you both track.",
};

export default function SolutionsIndex() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap">
          <p className="mkt-kicker">Who it&apos;s for</p>
          <h1 className="mkt-display">Built for how you practice.</h1>
          <p className="mkt-lead mkt-hero-lead-wide">
            Whatever you measure — a scan, a lab, a body-comp report — Central Health Intelligence turns
            it into a visual your client understands, an AI 90-day plan you approve, and progress you
            both track. Pick your modality.
          </p>
          <div className="mkt-hero-cta">
            <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
            <Link href="/product" className="mkt-btn ghost lg">How it works →</Link>
          </div>
        </div>
      </section>

      {/* ---- Vertical grid ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap">
          <div className="mkt-vert-grid">
            {VERTICALS.map((v) => (
              <Link key={v.slug} href={`/solutions/${v.slug}`} className="mkt-vert-card">
                <span className="mkt-vert-name">{v.name}</span>
                <span className="mkt-vert-doctor">{v.doctor.replace(/^For\s+/i, "")}</span>
                <span className="mkt-vert-lead">{v.lead}</span>
                <span className="mkt-vert-go">See how →</span>
              </Link>
            ))}
          </div>
          <p className="mkt-note mkt-vert-note">
            Don&apos;t see your modality? If it produces a scan, a lab or a report, we can almost certainly
            bring it in. <Link href="/contact" className="mkt-content-link">Tell us what you use.</Link>
          </p>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="mkt-section ink mkt-cta">
        <div className="mkt-wrap">
          <h2 className="mkt-h2">See it on your data.</h2>
          <p className="mkt-lead mkt-cta-lead">A short demo, your modality, your questions.</p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}
