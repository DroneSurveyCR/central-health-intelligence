/* eslint-disable react/no-unescaped-entities */
export const metadata = { title: "Notice of Privacy Practices (HIPAA) — Casa Elev8" };

const UPDATED = "June 2026";

export default function Notice() {
  return (
    <article>
      <div style={{ background: "rgba(244,166,60,0.12)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13.5 }}>
        <strong>Draft template.</strong> This U.S. HIPAA Notice of Privacy Practices applies only when Casa Elev8 operates as a
        HIPAA-covered entity (for example, serving U.S. patients). It is a starting point — have it reviewed by qualified U.S.
        healthcare-privacy counsel, and put Business Associate Agreements in place with each vendor, before relying on it.
      </div>

      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 4px" }}>Notice of Privacy Practices</h1>
      <p className="muted" style={{ marginTop: 0 }}>Effective: {UPDATED}</p>

      <p style={{ fontWeight: 600 }}>
        THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS
        INFORMATION. PLEASE REVIEW IT CAREFULLY.
      </p>

      <h2 className="serif">Our duties</h2>
      <p>
        Casa Elev8 / Elev8 Health is required by law to maintain the privacy of your protected health information (PHI), to
        give you this Notice of our legal duties and privacy practices, and to follow the terms of the Notice currently in
        effect. We are required to notify you following a breach of unsecured PHI.
      </p>

      <h2 className="serif">How we may use and disclose your PHI</h2>
      <ul>
        <li><strong>Treatment</strong> — to provide, coordinate, and manage your care (e.g., your practitioner reviewing your scans, labs, and plan).</li>
        <li><strong>Payment</strong> — to bill and collect for the care and products you receive.</li>
        <li><strong>Health care operations</strong> — to run and improve the practice, such as quality and administrative activities.</li>
        <li><strong>Business associates</strong> — with vendors who perform services for us (such as secure hosting, email, and payment processing) under written agreements requiring them to safeguard your PHI.</li>
        <li><strong>As required or permitted by law</strong> — including public-health, safety, and legal requirements.</li>
      </ul>
      <p>Other uses and disclosures — such as for marketing, or any sale of PHI — require your written authorization, which you may revoke.</p>

      <h2 className="serif">Your rights</h2>
      <ul>
        <li><strong>Access</strong> — inspect and obtain a copy of your PHI (available to download in the app's Privacy screen).</li>
        <li><strong>Amendment</strong> — request a correction of PHI you believe is inaccurate or incomplete.</li>
        <li><strong>Accounting of disclosures</strong> — request a list of certain disclosures we have made.</li>
        <li><strong>Restriction</strong> — request limits on certain uses and disclosures.</li>
        <li><strong>Confidential communications</strong> — request that we contact you a certain way or at a certain location.</li>
        <li><strong>Paper copy</strong> — obtain a paper copy of this Notice on request.</li>
        <li><strong>Breach notification</strong> — be notified if your unsecured PHI is breached.</li>
      </ul>

      <h2 className="serif">Complaints</h2>
      <p>
        If you believe your privacy rights have been violated, you may complain to us at <strong>info@elev8.health</strong> and to
        the U.S. Department of Health and Human Services, Office for Civil Rights. We will not retaliate against you for filing a complaint.
      </p>

      <h2 className="serif">Changes to this Notice</h2>
      <p>We may change this Notice and make the new terms effective for all PHI we maintain. The current Notice will always be posted here.</p>

      <h2 className="serif">Contact</h2>
      <p>For questions or to exercise your rights, contact the Casa Elev8 Privacy Officer at <strong>info@elev8.health</strong>.</p>
    </article>
  );
}
