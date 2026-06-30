import Link from "next/link";
import type { Metadata } from "next";
import { VERTICALS } from "@/lib/site/verticals";

/** Simple line-art glyph per modality, keyed by slug. */
const ICONS: Record<string, React.ReactNode> = {
  bioresonance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.2 12a3.8 3.8 0 0 1 7.6 0M5 12a7 7 0 0 1 14 0" />
    </svg>
  ),
  "functional-medicine": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 3h5M10.5 3v5.5l-4.7 8.5A2 2 0 0 0 7.6 20h8.8a2 2 0 0 0 1.8-3l-4.7-8.5V3" />
      <path d="M8 14.5h8" />
    </svg>
  ),
  "weight-loss": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7l5 5 3-3 8 8" />
      <path d="M20 12v5h-5" />
    </svg>
  ),
  longevity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21v-8" />
      <path d="M12 13c0-3 2.2-5 6-5 0 3.2-2.4 5-6 5z" />
      <path d="M12 16c0-2.4-2-4.2-6-4.2 0 2.4 2.2 4.2 6 4.2z" />
    </svg>
  ),
  "hormone-therapy": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5s5.5 5.6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3.5 12 3.5z" />
    </svg>
  ),
  chiropractic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 3.5v17" />
      <path d="M9 6h6M9 10h6M9 14h6M9 18h6" />
    </svg>
  ),
  "plant-medicine": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
      <path d="M5.5 18.5c4-4 8-6 12-7" />
    </svg>
  ),
};

const TINTS = ["mint", "gold", "sky", "mint", "gold", "sky", "mint"] as const;

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
            {VERTICALS.map((v, i) => (
              <Link key={v.slug} href={`/solutions/${v.slug}`} className="mkt-vert-card">
                <span className={`mkt-vert-icon tint-${TINTS[i % TINTS.length]}`} aria-hidden>
                  {ICONS[v.slug]}
                </span>
                <span className="mkt-vert-name">{v.name}</span>
                <span className="mkt-vert-doctor">{v.doctor.replace(/^For\s+/i, "")}</span>
                <span className="mkt-vert-lead">{v.lead}</span>
                <span className="mkt-vert-btn">See how it works →</span>
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
