"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "zelle", label: "Zelle" },
  { value: "stripe", label: "Stripe" },
];

type ApptOption = { id: string; label: string };

export default function PaymentForm({
  patientId,
  appointments,
}: {
  patientId: string;
  appointments: ApptOption[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [appointmentId, setAppointmentId] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Enter an amount greater than $0.00.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        amount: amt,
        method,
        receiptRef: receiptRef.trim() || null,
        appointmentId: appointmentId || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not record payment — please try again.");
      setBusy(false);
      return;
    }
    setAmount("");
    setMethod("cash");
    setAppointmentId("");
    setReceiptRef("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 16 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Record a payment
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={labelStyle}>
          Amount (USD)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Method
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={fieldStyle}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Appointment (optional)
          <select
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            style={fieldStyle}
          >
            <option value="">— None —</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Receipt reference (optional)
          <input
            type="text"
            value={receiptRef}
            onChange={(e) => setReceiptRef(e.target.value)}
            placeholder="e.g. invoice or transaction ID"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Recording…" : "Record payment"}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
} as const;
const fieldStyle = {
  padding: "12px 13px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
