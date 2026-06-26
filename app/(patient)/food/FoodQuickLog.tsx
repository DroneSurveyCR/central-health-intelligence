"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

type FoodRow = {
  name: string;
  qty: string;
  unit: string;
  kcal: string;
  protein_g: string;
  carb_g: string;
  fat_g: string;
};

function emptyRow(): FoodRow {
  return {
    name: "",
    qty: "",
    unit: "",
    kcal: "",
    protein_g: "",
    carb_g: "",
    fat_g: "",
  };
}

export default function FoodQuickLog() {
  const router = useRouter();

  const [mealType, setMealType] = useState<string>("breakfast");
  const [rows, setRows] = useState<FoodRow[]>([emptyRow()]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function setRow(i: number, patch: Partial<FoodRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(i: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  function num(s: string): number | null {
    return s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s);
  }

  async function save() {
    const foods = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        qty: num(r.qty),
        unit: r.unit.trim() || null,
        kcal: num(r.kcal),
        protein_g: num(r.protein_g),
        carb_g: num(r.carb_g),
        fat_g: num(r.fat_g),
      }));

    if (foods.length === 0) {
      setErr("Add at least one food with a name.");
      return;
    }

    setBusy(true);
    setErr("");
    const res = await fetch("/api/nutrition/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meal_type: mealType,
        foods,
        notes: notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not log meal.");
      setBusy(false);
      return;
    }
    setRows([emptyRow()]);
    setNotes("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 className="serif" style={{ fontSize: 19, marginTop: 0 }}>
        Log a meal
      </h2>

      <label style={labelStyle}>
        Meal type
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          style={fieldStyle}
        >
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 14,
        }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 11,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span className="muted" style={{ fontSize: 12 }}>
                Food {i + 1}
              </span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                style={{ padding: "2px 10px", fontSize: 13 }}
              >
                Remove
              </button>
            </div>
            <div style={row3}>
              <label style={labelStyle}>
                Name
                <input
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder="Greek yogurt"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Qty
                <input
                  value={r.qty}
                  onChange={(e) => setRow(i, { qty: e.target.value })}
                  inputMode="decimal"
                  placeholder="1"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Unit
                <input
                  value={r.unit}
                  onChange={(e) => setRow(i, { unit: e.target.value })}
                  placeholder="cup"
                  style={fieldStyle}
                />
              </label>
            </div>
            <div style={row4}>
              <label style={labelStyle}>
                kcal
                <input
                  value={r.kcal}
                  onChange={(e) => setRow(i, { kcal: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Protein (g)
                <input
                  value={r.protein_g}
                  onChange={(e) => setRow(i, { protein_g: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Carbs (g)
                <input
                  value={r.carb_g}
                  onChange={(e) => setRow(i, { carb_g: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                Fat (g)
                <input
                  value={r.fat_g}
                  onChange={(e) => setRow(i, { fat_g: e.target.value })}
                  inputMode="decimal"
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn ghost"
          type="button"
          onClick={addRow}
          style={{ fontSize: 14 }}
        >
          + Add food
        </button>
      </div>

      <label style={{ ...labelStyle, marginTop: 16 }}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>

      {err && (
        <p className="msg err" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Log meal"}
        </button>
      </div>
    </div>
  );
}

const row3 = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 12,
} as const;
const row4 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
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
