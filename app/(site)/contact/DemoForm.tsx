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
      <div
        className="mkt-device"
        role="status"
        aria-live="polite"
        style={{ padding: 28 }}
      >
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 8, color: "var(--green)" }}>
          Thank you — we&apos;ll be in touch.
        </div>
        <p className="mkt-muted" style={{ fontSize: 15, margin: 0 }}>
          Your request is in. A member of our team will reach out within one business day to set up a
          short demo on your specialty.
        </p>
        <button
          type="button"
          className="mkt-btn ghost"
          style={{ marginTop: 20 }}
          onClick={() => setSent(false)}
        >
          Send another
        </button>
      </div>
    );
  }

  const fieldLabel = {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--ink-2)",
    marginBottom: 6,
  } as const;

  const fieldInput = {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid var(--line)",
    borderRadius: 11,
    fontSize: 15,
    fontFamily: "var(--sans)",
    color: "var(--ink)",
    background: "#fff",
  } as const;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="mkt-device"
      style={{ padding: 28, display: "grid", gap: 18 }}
    >
      <div>
        <label htmlFor="df-name" style={fieldLabel}>Your name</label>
        <input id="df-name" name="name" type="text" required autoComplete="name" style={fieldInput} />
      </div>
      <div>
        <label htmlFor="df-clinic" style={fieldLabel}>Clinic</label>
        <input id="df-clinic" name="clinic" type="text" required autoComplete="organization" style={fieldInput} />
      </div>
      <div>
        <label htmlFor="df-email" style={fieldLabel}>Work email</label>
        <input id="df-email" name="email" type="email" required autoComplete="email" style={fieldInput} />
      </div>
      <div>
        <label htmlFor="df-specialty" style={fieldLabel}>Specialty</label>
        <select id="df-specialty" name="specialty" required defaultValue="" style={fieldInput}>
          <option value="" disabled>Select a specialty…</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="df-message" style={fieldLabel}>What would you like to see?</label>
        <textarea id="df-message" name="message" rows={4} style={{ ...fieldInput, resize: "vertical" }} />
      </div>
      <div>
        <button type="submit" className="mkt-btn lg">Request a demo</button>
      </div>
    </form>
  );
}
