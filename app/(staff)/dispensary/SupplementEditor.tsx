"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupplementEditor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setErr("");
    setSaved(false);
    if (!name.trim()) {
      setErr("Give the supplement a name.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setErr("Enter a valid price.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: "supplement",
          price: priceNum,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "Could not save — please try again.");
        setBusy(false);
        return;
      }
      setName("");
      setPrice("");
      setSaved(true);
      setBusy(false);
      router.refresh();
    } catch {
      setErr("Could not save — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, marginTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={labelStyle}>
          Name
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="Magnesium Glycinate"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          Price
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setSaved(false);
            }}
            placeholder="0.00"
            style={fieldStyle}
          />
        </label>
      </div>

      {err && (
        <p style={{ margin: "10px 0 0", color: "#b4231f", fontSize: 13 }}>{err}</p>
      )}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={save}
          disabled={busy}
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving…" : "Add supplement"}
        </button>
        {saved && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(20,131,78,0.12)",
              color: "var(--berry)",
            }}
          >
            Added
          </span>
        )}
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
  padding: "10px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  background: "#fff",
} as const;
