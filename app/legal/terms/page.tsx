/* eslint-disable react/no-unescaped-entities */
export const metadata = { title: "Terms of Service — Casa Elev8" };

const UPDATED = "June 2026";

export default function Terms() {
  return (
    <article>
      <div style={{ background: "rgba(244,166,60,0.12)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13.5 }}>
        <strong>Draft template.</strong> Prepared for Casa Elev8 as a starting point. Have it reviewed by qualified legal counsel before relying on it.
      </div>

      <h1 className="serif" style={{ fontSize: 30, margin: "0 0 4px" }}>Terms of Service</h1>
      <p className="muted" style={{ marginTop: 0 }}>Last updated: {UPDATED}</p>

      <p>
        These Terms govern your use of the HealthSync patient application provided by <strong>Casa Elev8 / Elev8 Health</strong>
        ("we," "us"). By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2 className="serif">1. What the Service is</h2>
      <p>
        The Service is a tool to help you manage your care with Casa Elev8 — your program, daily plan, results, appointments,
        messages, and billing. It supports your care; it does not replace the professional judgment of your practitioner.
      </p>

      <div style={{ background: "rgba(224,97,59,0.10)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", margin: "16px 0", fontSize: 14 }}>
        <strong>Not for emergencies.</strong> The Service is not for medical emergencies. If you have a medical emergency,
        call your local emergency number or go to the nearest emergency department. Do not use messages in the app for urgent issues.
      </div>

      <h2 className="serif">2. Accounts</h2>
      <ul>
        <li>Provide accurate information and keep it up to date.</li>
        <li>Keep your login secure and do not share it. You are responsible for activity under your account.</li>
        <li>Tell us promptly if you suspect unauthorized access.</li>
      </ul>

      <h2 className="serif">3. Medical disclaimer</h2>
      <p>
        Information in the app (including plans, educational articles, and scan summaries) is for your care with Casa Elev8 and
        general education. It is not a substitute for in-person evaluation, diagnosis, or treatment, and using the app alone does
        not create a practitioner-patient relationship. Always follow your practitioner's directions.
      </p>

      <h2 className="serif">4. Payments and billing</h2>
      <ul>
        <li>Charges for services and products appear as invoices in the app. Applicable taxes are added where required.</li>
        <li>You can pay by card (processed by our payment provider) or by the other methods the clinic offers.</li>
        <li>Refunds, cancellations, and no-show policies are handled by the clinic — contact us with any billing question.</li>
      </ul>

      <h2 className="serif">5. Acceptable use</h2>
      <p>You agree not to misuse the Service — including attempting to access data that is not yours, disrupting the Service, or using it unlawfully.</p>

      <h2 className="serif">6. Intellectual property</h2>
      <p>The Service, its software, and its content are owned by us or our licensors. Your own health data remains yours.</p>

      <h2 className="serif">7. Privacy</h2>
      <p>Our handling of your information is described in our <a href="/legal/privacy">Privacy Policy</a>.</p>

      <h2 className="serif">8. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided "as is." To the maximum extent permitted by law, we are not liable for indirect or
        consequential damages arising from your use of the Service. Nothing in these Terms limits liability that cannot be
        limited by law, including for the care you receive from your practitioner.
      </p>

      <h2 className="serif">9. Termination</h2>
      <p>You may stop using the Service and delete your account at any time from the Privacy screen. We may suspend access for misuse or to protect the Service.</p>

      <h2 className="serif">10. Governing law</h2>
      <p>These Terms are governed by the laws of the Republic of Costa Rica, without regard to conflict-of-laws rules, unless your local law requires otherwise.</p>

      <h2 className="serif">11. Changes</h2>
      <p>We may update these Terms and will post the updated version here with a new date. Continued use means you accept the changes.</p>

      <h2 className="serif">12. Contact</h2>
      <p>Questions about these Terms? Contact Casa Elev8 at <strong>info@elev8.health</strong>.</p>
    </article>
  );
}
