"use client";

import { useState } from "react";

export default function PayButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pay() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (j.url) {
        window.location.href = j.url; // hosted Stripe Checkout
        return;
      }
      setErr(j.error || "Could not start payment.");
    } catch {
      setErr("Could not start payment.");
    }
    setBusy(false);
  }

  return (
    <span className="no-print">
      <button type="button" className="btn" onClick={pay} disabled={busy}>
        {busy ? "Redirecting…" : label}
      </button>
      {err && <span style={{ color: "var(--rust)", fontSize: 13, marginLeft: 10 }}>{err}</span>}
    </span>
  );
}
