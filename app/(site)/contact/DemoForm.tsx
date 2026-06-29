"use client";

import { useState } from "react";

const SPECIALTIES = [
  "Longevity / preventive",
  "Functional / integrative",
  "Peptide / GLP-1",
  "Hormone / HRT",
  "Plant medicine / KAP",
  "Other",
];

export default function DemoForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mkt-device mkt-form-success" role="status" aria-live="polite">
        <div className="mkt-form-success-title">Thank you — we&apos;ll be in touch.</div>
        <p className="mkt-form-success-body">
          Your request is in. A member of our team will reach out within one business day to set up a
          short demo on your specialty.
        </p>
        <button type="button" className="mkt-btn ghost mkt-btn-gap" onClick={() => setSent(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      className="mkt-device mkt-demo-form"
    >
      <div>
        <label htmlFor="df-name" className="mkt-form-label">Your name</label>
        <input id="df-name" name="name" type="text" required autoComplete="name" className="mkt-form-input" />
      </div>
      <div>
        <label htmlFor="df-clinic" className="mkt-form-label">Clinic</label>
        <input id="df-clinic" name="clinic" type="text" required autoComplete="organization" className="mkt-form-input" />
      </div>
      <div>
        <label htmlFor="df-email" className="mkt-form-label">Work email</label>
        <input id="df-email" name="email" type="email" required autoComplete="email" className="mkt-form-input" />
      </div>
      <div>
        <label htmlFor="df-specialty" className="mkt-form-label">Specialty</label>
        <select id="df-specialty" name="specialty" required defaultValue="" className="mkt-form-input">
          <option value="" disabled>Select a specialty…</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="df-message" className="mkt-form-label">What would you like to see?</label>
        <textarea id="df-message" name="message" rows={4} className="mkt-form-textarea" />
      </div>
      <div>
        <button type="submit" className="mkt-btn lg">Request a demo</button>
      </div>
    </form>
  );
}
