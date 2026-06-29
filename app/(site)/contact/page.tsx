import Link from "next/link";
import type { Metadata } from "next";
import DemoForm from "./DemoForm";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "Book a short demo of Central Health Intelligence on your specialty — or email hello@healthintelligency.com. We'll be in touch within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <section className="mkt-section mkt-hero">
        <div className="mkt-wrap mkt-row">
          <div>
            <p className="mkt-kicker">Book a demo</p>
            <h1 className="mkt-display">
              See it on your
              <br />
              clinic&apos;s data.
            </h1>
            <p className="mkt-lead">
              A short, focused walkthrough — your specialty, your questions, the live-data and AI layer
              in action. No slide deck unless you want one.
            </p>

            <div className="mkt-contact-expect">
              <p className="mkt-kicker" style={{ marginBottom: 14 }}>What to expect</p>
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
            <DemoForm />
          </div>
        </div>
      </section>
    </>
  );
}
