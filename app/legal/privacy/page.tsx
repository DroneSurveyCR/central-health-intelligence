/* eslint-disable react/no-unescaped-entities */
export const metadata = { title: "Privacy Policy — Casa Elev8" };

const UPDATED = "June 2026";

export default function PrivacyPolicy() {
  return (
    <article>
      <div style={{ background: "rgba(244,166,60,0.12)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13.5 }}>
        <strong>Draft template.</strong> This document is a starting point prepared for Casa Elev8. Have it reviewed by qualified legal counsel for your jurisdiction (Costa Rica, and the United States if you serve U.S. patients) before relying on it.
      </div>

      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 4px" }}>Privacy Policy</h1>
      <p className="muted" style={{ marginTop: 0 }}>Last updated: {UPDATED}</p>

      <p>
        This Privacy Policy explains how <strong>Casa Elev8 / Elev8 Health</strong> ("we," "us," "the clinic") collects, uses,
        stores, and protects your personal and health information when you use the HealthSync patient application and
        related services (the "Service"). We take the privacy of your health information seriously.
      </p>

      <h2 className="serif">1. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your name, email, phone, and login details.</li>
        <li><strong>Health and intake information</strong> — your intake questionnaire, medical history, goals, symptoms, and similar details you provide.</li>
        <li><strong>Clinical information</strong> — scans and their findings, lab results, your care plan, progress logs, vitals, appointments, and notes from your care team.</li>
        <li><strong>Billing information</strong> — invoices, payment method and status, and receipts. Card payments are processed by our payment provider; we do not store full card numbers.</li>
        <li><strong>Usage information</strong> — basic technical data needed to operate and secure the Service.</li>
      </ul>

      <h2 className="serif">2. How we use your information</h2>
      <ul>
        <li>To provide your care, manage your program, and let you and your care team track progress.</li>
        <li>To schedule appointments and send appointment reminders (which never contain medical details).</li>
        <li>To prepare and manage invoices, receipts, and payments.</li>
        <li>To secure the Service, maintain audit records of access to health data, and meet legal obligations.</li>
      </ul>

      <h2 className="serif">3. Legal basis and consent</h2>
      <p>
        We process your health information to provide you care and with your consent, and as permitted or required by
        applicable law. You may withdraw consent at any time (see <em>Your rights</em>); withdrawing consent may limit our
        ability to provide the Service.
      </p>

      <h2 className="serif">4. How we protect your information</h2>
      <ul>
        <li>Data is encrypted in transit (TLS) and at rest.</li>
        <li>Access is governed by row-level security so each patient can only see their own records, and staff only the patients they are authorized to treat.</li>
        <li>Access to health data is recorded in audit logs. Staff accounts support multi-factor authentication.</li>
        <li>Reminder and notification emails never include protected health information.</li>
      </ul>

      <h2 className="serif">5. Who we share information with</h2>
      <p>We do not sell your information. We share it only:</p>
      <ul>
        <li><strong>With your care team</strong> at Casa Elev8, to provide your care.</li>
        <li><strong>With service providers</strong> who help us run the Service under contract and confidentiality obligations — currently our hosting and database provider (Supabase), application hosting (Vercel), transactional email (Resend), and payment processing (Stripe). These providers process data only on our instructions.</li>
        <li><strong>When required by law</strong>, or to protect the rights, safety, and security of patients and the clinic.</li>
      </ul>

      <h2 className="serif">6. International data transfers</h2>
      <p>
        Some of our service providers process data on servers located outside Costa Rica (including the United States).
        Where this happens, we take steps intended to keep your information protected to the standard described here.
      </p>

      <h2 className="serif">7. Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li><strong>Access and download</strong> your data — from the <em>Privacy</em> screen in the app.</li>
        <li><strong>Request correction</strong> of inaccurate information — ask your care team.</li>
        <li><strong>Delete your account</strong> and request deletion of your data — from the <em>Privacy</em> screen, subject to records we must retain by law.</li>
        <li><strong>Withdraw consent</strong> or object to certain processing.</li>
      </ul>

      <h2 className="serif">8. Data retention</h2>
      <p>
        We keep your information for as long as you are a patient and for any additional period required by applicable
        medical-records and tax laws. After that, we delete or anonymize it.
      </p>

      <h2 className="serif">9. Children</h2>
      <p>The Service is intended for adults. Minors should use it only with the involvement of a parent or guardian and the clinic.</p>

      <h2 className="serif">10. Changes to this policy</h2>
      <p>We may update this policy. We will post the updated version here with a new "last updated" date and, where appropriate, notify you.</p>

      <h2 className="serif">11. Contact us</h2>
      <p>
        To exercise your rights or ask a privacy question, contact Casa Elev8 at <strong>info@elev8.health</strong>.
        If you are in Costa Rica, you also have the right to lodge a complaint with the national data-protection authority (PRODHAB).
      </p>
    </article>
  );
}
