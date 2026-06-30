"use client";

import { useEffect, useState } from "react";
import { VERTICALS } from "@/lib/site/verticals";

const OPTIONS = [
  "AI-built 90-day plans",
  "The client app + AI assistant",
  "Upload scans & labs → visual",
  "Scheduling & intake",
  "Dispensary / supplements",
  "Email & campaigns",
  "Multi-location / multi-doctor",
  "HIPAA / compliance",
];

export default function LeadForm({
  intent = "demo",
  source = "contact",
}: {
  intent?: "demo" | "pricing" | "get_started";
  source?: string;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clinic, setClinic] = useState("");
  const [vertical, setVertical] = useState("");
  const [options, setOptions] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  // Prefill the referral code from the URL (?ref=) or a code persisted by RefCapture.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("ref");
      const stored = localStorage.getItem("chi_ref");
      const code = (fromUrl || stored || "").trim().slice(0, 40);
      if (code) setRef(code);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(o: string) {
    setOptions((prev) => {
      const n = new Set(prev);
      n.has(o) ? n.delete(o) : n.add(o);
      return n;
    });
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Please enter your name and a valid email.");
      return;
    }
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, clinic, vertical, intent, options: [...options], message, ref, source }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || json.error) setErr(json.error ?? "Something went wrong.");
      else setSent(true);
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mkt-device mkt-form-success" role="status" aria-live="polite">
        <div className="mkt-form-success-title">Thank you — we&apos;ll be in touch.</div>
        <p className="mkt-form-success-body">
          We&apos;ll reach out within one business day to set up a walkthrough on your specialty.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={step === 1 ? next : submit} className="mkt-device mkt-demo-form">
      <p className="mkt-lead-step">Step {step} of 2</p>

      {step === 1 ? (
        <>
          <div>
            <label htmlFor="lf-name" className="mkt-form-label">Your name</label>
            <input id="lf-name" className="mkt-form-input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div>
            <label htmlFor="lf-email" className="mkt-form-label">Work email</label>
            <input id="lf-email" type="email" className="mkt-form-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="lf-phone" className="mkt-form-label">Phone</label>
            <input id="lf-phone" type="tel" className="mkt-form-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="lf-clinic" className="mkt-form-label">Clinic / practice</label>
            <input id="lf-clinic" className="mkt-form-input" value={clinic} onChange={(e) => setClinic(e.target.value)} autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="lf-ref" className="mkt-form-label">Referral code <span className="mkt-form-optional">(optional)</span></label>
            <input id="lf-ref" className="mkt-form-input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="If a partner referred you" />
          </div>
          {err && <p className="mkt-form-err">{err}</p>}
          <div><button type="submit" className="mkt-btn lg">Continue →</button></div>
        </>
      ) : (
        <>
          <div>
            <label className="mkt-form-label">Your vertical</label>
            <div className="mkt-chip-row">
              {VERTICALS.map((v) => (
                <button type="button" key={v.slug} onClick={() => setVertical(v.slug)}
                  className={`mkt-chip${vertical === v.slug ? " on" : ""}`}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mkt-form-label">What do you need?</label>
            <div className="mkt-chip-row">
              {OPTIONS.map((o) => (
                <button type="button" key={o} onClick={() => toggle(o)}
                  className={`mkt-chip${options.has(o) ? " on" : ""}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="lf-msg" className="mkt-form-label">Anything else? (optional)</label>
            <textarea id="lf-msg" rows={3} className="mkt-form-textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {err && <p className="mkt-form-err">{err}</p>}
          <div className="mkt-lead-actions">
            <button type="button" className="mkt-btn ghost" onClick={() => setStep(1)}>← Back</button>
            <button type="submit" className="mkt-btn lg" disabled={busy}>{busy ? "Sending…" : "Request it"}</button>
          </div>
        </>
      )}
    </form>
  );
}
