import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VERTICALS, getVertical } from "@/lib/site/verticals";
import { Browser } from "@/components/site/Device";

export function generateStaticParams() {
  return VERTICALS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = getVertical(slug);
  if (!v) return { title: "Solutions" };
  return {
    title: `${v.name} — Central Health Intelligence`,
    description: `${v.lead}`,
  };
}

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = getVertical(slug);
  if (!v) notFound();

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">{v.doctor}</p>
            <h1 className="mkt-display">{v.headline}</h1>
            <p className="mkt-lead">{v.lead}</p>
            <div className="mkt-hero-cta">
              <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
              <Link href="/product" className="mkt-btn ghost lg">How it works →</Link>
            </div>
          </div>
          <div className="mkt-row-media">
            <Browser src={v.shot} alt={`${v.name} in Central Health Intelligence`} label="app.healthintelligency.com" tilt />
          </div>
        </div>
      </section>

      {/* ---- How it works for you ---- */}
      <section className="mkt-section mint">
        <div className="mkt-wrap">
          <p className="mkt-kicker">How it works for you</p>
          <h2 className="mkt-h2">Your {shortDevice(v.device)} → a visual → a plan → progress.</h2>
          <p className="mkt-lead mkt-p-lead-gap">{v.importNote}</p>
          <div className="mkt-three">
            {v.steps.map((s, i) => (
              <div key={s.title}>
                <p className="mkt-kicker">Step {i + 1}</p>
                <h3 className="mkt-h3">{s.title}</h3>
                <p className="mkt-muted mkt-three-p">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- What you get ---- */}
      <section className="mkt-section">
        <div className="mkt-wrap mkt-row rev">
          <div className="mkt-row-media">
            <Browser src="be-plan-builder.png" alt="The AI-drafted plan a doctor reviews and approves" label="app.healthintelligency.com/plan" />
          </div>
          <div>
            <p className="mkt-kicker">Built for {who(v.doctor)}</p>
            <h2 className="mkt-h2">Everything tied to one client.</h2>
            <ul className="mkt-points">
              {v.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mkt-p">
              The AI drafts the plan and the notes; you approve. The client follows a clean schedule and
              asks the AI assistant their questions — so the back-and-forth stops filling your inbox.
            </p>
            <div className="mkt-action">
              <Link href="/product" className="mkt-btn ghost">See the full flow</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mkt-section mint-2">
        <div className="mkt-wrap">
          <h2 className="mkt-h2 mkt-faq-heading">Questions, answered.</h2>
          <div className="mkt-faq">
            {v.faq.map(([q, a]) => (
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
          <h2 className="mkt-h2">See it on your {shortDevice(v.device)}.</h2>
          <p className="mkt-lead mkt-cta-lead">A short demo, your modality, your questions.</p>
          <Link href="/contact" className="mkt-btn lg">Book a demo</Link>
        </div>
      </section>
    </>
  );
}

/** "bioresonance / biofeedback scan (ZYTO, …)" → "scan"-ish short noun for headings. */
function shortDevice(device: string): string {
  const base = device.split("(")[0].split(",")[0].split("/")[0].trim();
  return base.toLowerCase();
}

/** Turn "For functional & integrative-medicine doctors" → "functional & integrative-medicine doctors". */
function who(doctor: string): string {
  return doctor.replace(/^For\s+/i, "");
}
