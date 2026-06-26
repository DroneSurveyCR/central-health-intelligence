"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTAKE_SECTIONS, type Field } from "@/lib/intake/schema";

type Data = Record<string, unknown>;

export default function IntakeWizard({
  initialData,
  initialStep,
}: {
  initialData: Data;
  initialStep: number;
}) {
  const router = useRouter();
  const total = INTAKE_SECTIONS.length;
  const [data, setData] = useState<Data>(initialData ?? {});
  const [step, setStep] = useState(Math.min(Math.max(initialStep ?? 0, 0), total - 1));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const section = INTAKE_SECTIONS[step];
  const last = step === total - 1;
  const pct = Math.round((step / total) * 100);

  function set(id: string, value: unknown) {
    setData((d) => ({ ...d, [id]: value }));
  }
  function toggle(id: string, opt: string) {
    setData((d) => {
      const arr = Array.isArray(d[id]) ? (d[id] as string[]) : [];
      return {
        ...d,
        [id]: arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt],
      };
    });
  }

  async function save(nextStep: number, completed = false) {
    setSaving(true);
    await fetch("/api/intake/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_data: data, current_step: nextStep, completed }),
    });
    setSaving(false);
  }

  async function next() {
    if (last) {
      await save(step, true);
      setDone(true);
      setTimeout(() => router.push("/home"), 1400);
      return;
    }
    const ns = step + 1;
    await save(ns);
    setStep(ns);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function back() {
    const ns = Math.max(0, step - 1);
    await save(ns);
    setStep(ns);
  }

  if (done)
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="msg ok">Thank you — your intake is submitted. Taking you to your dashboard…</p>
      </div>
    );

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--berry)" }}>
        <span>Step {step + 1} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "var(--line)", borderRadius: 99, overflow: "hidden", margin: "8px 0 18px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--berry)", transition: "width .3s" }} />
      </div>

      <h2 className="serif" style={{ fontSize: 21, margin: "0 0 14px" }}>{section.title}</h2>

      <div className="form">
        {section.fields.map((f) => (
          <FieldInput key={f.id} field={f} value={data[f.id]} onSet={set} onToggle={toggle} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button className="btn ghost" onClick={back} disabled={step === 0 || saving} type="button">
          ← Back
        </button>
        <button className="btn" onClick={next} disabled={saving} type="button">
          {saving ? "Saving…" : last ? "Submit" : "Next →"}
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onSet,
  onToggle,
}: {
  field: Field;
  value: unknown;
  onSet: (id: string, v: unknown) => void;
  onToggle: (id: string, opt: string) => void;
}) {
  if (field.type === "multi") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{field.label}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {field.options.map((opt) => {
            const on = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(field.id, opt)}
                style={{
                  border: `1.5px solid ${on ? "var(--berry)" : "var(--line)"}`,
                  background: on ? "var(--berry)" : "#fff",
                  color: on ? "#fff" : "var(--ink)",
                  borderRadius: 999,
                  padding: "7px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <label>
        {field.label}
        <select value={(value as string) ?? ""} onChange={(e) => onSet(field.id, e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "slider") {
    const v = typeof value === "number" ? value : field.min;
    return (
      <label>
        {field.label}: <b>{v}</b>
        <input
          type="range"
          min={field.min}
          max={field.max}
          value={v}
          onChange={(e) => onSet(field.id, Number(e.target.value))}
        />
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label>
        {field.label}
        <textarea rows={3} value={(value as string) ?? ""} onChange={(e) => onSet(field.id, e.target.value)} />
      </label>
    );
  }

  return (
    <label>
      {field.label}
      <input
        type={field.type}
        value={(value as string) ?? ""}
        onChange={(e) => onSet(field.id, e.target.value)}
      />
    </label>
  );
}
