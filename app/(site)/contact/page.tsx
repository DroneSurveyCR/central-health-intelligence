import Link from "next/link";
import type { Metadata } from "next";
import LeadForm from "./LeadForm";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "Book a short demo of Central Health Intelligence on your specialty — or email hello@healthintelligency.com. We'll be in touch within one business day.",
};

type Intent = "demo" | "pricing" | "get_started";
const COPY: Record<Intent, { kicker: string; h1a: string; h1b: string; lead: string }> = {
  demo: {
    kicker: "Book a demo",
    h1a: "See it on your",
    h1b: "clients’ data.",
    lead: "A short, focused walkthrough — your specialty, your questions, the platform in action. Tell us a bit about you and your practice first.",
  },
  pricing: {
    kicker: "Get pricing",
    h1a: "Pricing for",
    h1b: "your practice.",
    lead: "Tell us your specialty and what you need — we’ll map a plan, the modules and the right edition, and send a tailored quote.",
  },
  get_started: {
    kicker: "Get started",
    h1a: "Get the",
    h1b: "software.",
    lead: "Tell us about your practice and what you need — we’ll set up your instance and get you live.",
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const sp = await searchParams;
  const intent: Intent = (["demo", "pricing", "get_started"].includes(sp.intent ?? "") ? sp.intent : "demo") as Intent;
  const c = COPY[intent];
  return (
    <>
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">{c.kicker}</p>
            <h1 className="mkt-display">
              {c.h1a}
              <br />
              {c.h1b}
            </h1>
            <p className="mkt-lead">{c.lead}</p>

            <div className="mkt-contact-expect">
              <p className="mkt-kicker">What to expect</p>
              <ul className="mkt-points">
                <li>A reply within one business day to find a time</li>
                <li>A 30-minute demo tailored to your specialty</li>
                <li>Straight answers on isolation, compliance and pricing</li>
              </ul>
            </div>

            <div className="mkt-contact-divider">
              <p className="mkt-muted mkt-contact-fine">
                Prefer email? Reach us at{" "}
                <a href="mailto:hello@healthintelligency.com" className="mkt-content-link">
                  hello@healthintelligency.com
                </a>
                {" "}— or read our{" "}
                <Link href="/trust" className="mkt-content-link">security &amp; compliance</Link>
                {" "}page first.
              </p>
            </div>
          </div>

          <div className="mkt-row-media">
            <LeadForm intent={intent} source={`contact-${intent}`} />
          </div>
        </div>
      </section>
    </>
  );
}
