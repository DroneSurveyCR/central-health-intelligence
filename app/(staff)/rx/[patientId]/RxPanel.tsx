"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Rx = {
  id: string;
  medication: string;
  dose: string | null;
  sig: string | null;
  quantity: string | null;
  refills: number | null;
  pharmacy_name: string | null;
  status: string;
  signed_at: string | null;
};

export default function RxPanel({
  patientId,
  prescriptions,
}: {
  patientId: string;
  prescriptions: Rx[];
}) {
  const router = useRouter();

  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [sig, setSig] = useState("");
  const [quantity, setQuantity] = useState("");
  const [refills, setRefills] = useState("0");
  const [pharmacyName, setPharmacyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function create() {
    if (!medication.trim()) {
      setErr("Enter a medication.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await fetch("/api/rx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        medication: medication.trim(),
        dose: dose.trim() || null,
        sig: sig.trim() || null,
        quantity: quantity.trim() || null,
        refills: refills.trim() === "" ? 0 : refills,
        pharmacy_name: pharmacyName.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save prescription.");
      setBusy(false);
      return;
    }
    setMedication("");
    setDose("");
    setSig("");
    setQuantity("");
    setRefills("0");
    setPharmacyName("");
    setBusy(false);
    router.refresh();
  }

  async function sign(id: string) {
    setSigning(id);
    setErr("");
    const res = await fetch("/api/rx", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not sign prescription.");
      setSigning(null);
      return;
    }
    setSigning(null);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card" style={{ maxWidth: 640 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          New prescription
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={row2}>
            <label style={labelStyle}>
              Medication
              <input
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                placeholder="Amoxicillin"
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Dose
              <input
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="500 mg"
                style={fieldStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Sig (instructions)
            <input
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              placeholder="Take 1 capsule by mouth three times daily"
              style={fieldStyle}
            />
          </label>

          <div style={row2}>
            <label style={labelStyle}>
              Quantity
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="30 capsules"
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Refills
              <input
                value={refills}
                onChange={(e) => setRefills(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                style={fieldStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Pharmacy
            <input
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="Patient's preferred pharmacy"
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
          <button className="btn" type="button" disabled={busy} onClick={create}>
            {busy ? "Saving…" : "New prescription"}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginTop: 18 }}>
        <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
          Prescriptions
        </h2>
        {prescriptions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No prescriptions yet.
          </p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Medication</th>
                <th style={thStyle}>Dose</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id}>
                  <td style={tdStyle}>{rx.medication}</td>
                  <td style={tdStyle}>{rx.dose ?? "—"}</td>
                  <td style={tdStyle}>
                    <span className="badge">{rx.status}</span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {rx.status === "draft" ? (
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={signing === rx.id}
                        onClick={() => sign(rx.id)}
                        style={{ padding: "2px 10px", fontSize: 13 }}
                      >
                        {signing === rx.id ? "Signing…" : "Sign"}
                      </button>
                    ) : null}
                    <Link
                      className="btn ghost"
                      href={`/rx/${patientId}/${rx.id}/print`}
                      style={{
                        padding: "2px 10px",
                        fontSize: 13,
                        textDecoration: "none",
                        marginLeft: 6,
                      }}
                    >
                      Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const row2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
} as const;
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
const thStyle = {
  textAlign: "left",
  borderBottom: "1.5px solid var(--line)",
  padding: "6px 8px",
  color: "var(--muted)",
} as const;
const tdStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "6px 8px",
} as const;
